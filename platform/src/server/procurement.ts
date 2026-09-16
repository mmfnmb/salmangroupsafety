"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { nextPurchaseRequestNumber, nextPurchaseOrderNumber } from "@/lib/numbering";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Any org member (technicians included) can request materials or work.
 * The system checks inventory automatically: if a matching part has
 * enough stock, the request is fulfilled immediately and stock is
 * decremented — no approval needed. Otherwise it waits for a supervisor.
 */
export async function createPurchaseRequest(formData: FormData) {
  const session = await requireOrgSession();

  const siteId = str(formData, "siteId");
  const itemName = str(formData, "itemName");
  const quantity = Number(str(formData, "quantity") ?? "0");
  if (!siteId || !itemName || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Site, item and a positive quantity are required");
  }

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId: session.orgId } });
  if (!site) throw new Error("Invalid site");

  const workOrderId = str(formData, "workOrderId");
  if (workOrderId) {
    const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, orgId: session.orgId } });
    if (!wo) throw new Error("Invalid work order");
  }

  const partId = str(formData, "partId");
  const number = await nextPurchaseRequestNumber(session.orgId);

  const request = await prisma.$transaction(async (tx) => {
    let stockAvailable = false;
    let part = null;
    if (partId) {
      part = await tx.part.findFirst({ where: { id: partId, orgId: session.orgId } });
      if (!part) throw new Error("Invalid part");
      stockAvailable = part.stockQuantity >= quantity;
    }

    const pr = await tx.purchaseRequest.create({
      data: {
        orgId: session.orgId,
        requestNumber: number,
        siteId,
        workOrderId: workOrderId ?? undefined,
        partId: partId ?? undefined,
        itemName,
        category: str(formData, "category"),
        quantity,
        unit: str(formData, "unit"),
        notes: str(formData, "notes"),
        requestedByUserId: session.userId,
        stockAvailableAtRequest: stockAvailable,
        status: stockAvailable ? "FULFILLED_FROM_STOCK" : "PENDING_APPROVAL",
        decidedAt: stockAvailable ? new Date() : undefined,
      },
    });

    if (stockAvailable && part) {
      await tx.part.update({ where: { id: part.id }, data: { stockQuantity: { decrement: quantity } } });
      if (workOrderId) {
        await tx.workOrderPartUsed.create({
          data: { workOrderId, partId: part.id, partName: part.name, quantity, unitCostSar: part.unitCostSar },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        action: "CREATE",
        entityType: "PurchaseRequest",
        entityId: pr.id,
        newValue: { requestNumber: number, itemName, quantity, stockAvailable },
      },
    });

    return pr;
  });

  revalidatePath("/app/procurement");
  redirect(`/app/procurement/${request.id}`);
}

const SUPERVISORY_ROLES = ["ACCOUNT_OWNER", "FACILITY_MANAGER", "MAINTENANCE_MANAGER", "MAINTENANCE_SUPERVISOR"] as const;

export async function approvePurchaseRequest(requestId: string) {
  const session = await requireOrgSession();
  if (!(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) throw new Error("Not authorized to approve");

  const pr = await prisma.purchaseRequest.findFirst({ where: { id: requestId, orgId: session.orgId } });
  if (!pr) throw new Error("Purchase request not found");
  if (pr.status !== "PENDING_APPROVAL") throw new Error("This request is not awaiting approval");

  const orderNumber = await nextPurchaseOrderNumber(session.orgId);

  const order = await prisma.$transaction(async (tx) => {
    await tx.purchaseRequest.update({
      where: { id: pr.id },
      data: { status: "APPROVED", decidedByUserId: session.userId, decidedAt: new Date() },
    });
    const po = await tx.purchaseOrder.create({
      data: { orgId: session.orgId, orderNumber, purchaseRequestId: pr.id },
    });
    await tx.auditLog.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        action: "APPROVE",
        entityType: "PurchaseRequest",
        entityId: pr.id,
        newValue: { purchaseOrderId: po.id, orderNumber },
      },
    });
    return po;
  });

  revalidatePath("/app/procurement");
  redirect(`/app/procurement/orders/${order.id}`);
}

export async function rejectPurchaseRequest(requestId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) throw new Error("Not authorized to reject");

  const pr = await prisma.purchaseRequest.findFirst({ where: { id: requestId, orgId: session.orgId } });
  if (!pr) throw new Error("Purchase request not found");
  if (pr.status !== "PENDING_APPROVAL") throw new Error("This request is not awaiting approval");

  await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: "REJECTED", decidedByUserId: session.userId, decidedAt: new Date(), notes: str(formData, "reason") ?? pr.notes },
  });

  await prisma.auditLog.create({
    data: { orgId: session.orgId, userId: session.userId, action: "REJECT", entityType: "PurchaseRequest", entityId: pr.id },
  });

  revalidatePath("/app/procurement");
  revalidatePath(`/app/procurement/${pr.id}`);
}

export async function assignSupplierToOrder(orderId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role) && !(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) {
    throw new Error("Not authorized");
  }

  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, orgId: session.orgId } });
  if (!order) throw new Error("Purchase order not found");

  const supplierVendorId = str(formData, "supplierVendorId");
  if (supplierVendorId) {
    const vendor = await prisma.vendor.findFirst({ where: { id: supplierVendorId, status: "APPROVED" } });
    if (!vendor) throw new Error("Invalid supplier");
  }

  const unitCostSar = str(formData, "unitCostSar") ? Number(str(formData, "unitCostSar")) : null;
  const totalCostSar = str(formData, "totalCostSar") ? Number(str(formData, "totalCostSar")) : null;

  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: {
      supplierVendorId: supplierVendorId ?? undefined,
      supplierNameFreeText: supplierVendorId ? null : str(formData, "supplierNameFreeText"),
      supplierContact: str(formData, "supplierContact"),
      unitCostSar,
      totalCostSar,
      status: "ORDERED",
      orderedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { orgId: session.orgId, userId: session.userId, action: "ORDER", entityType: "PurchaseOrder", entityId: order.id },
  });

  revalidatePath(`/app/procurement/orders/${order.id}`);
  revalidatePath("/app/procurement");
}

export async function markOrderSupplied(orderId: string) {
  const session = await requireOrgSession();
  if (!(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) throw new Error("Not authorized");

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, orgId: session.orgId },
    include: { purchaseRequest: true },
  });
  if (!order) throw new Error("Purchase order not found");
  if (order.status !== "ORDERED") throw new Error("Only an ordered purchase can be marked supplied");

  const pr = order.purchaseRequest;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "SUPPLIED", suppliedAt: new Date() } });
    await tx.purchaseRequest.update({ where: { id: pr.id }, data: { status: "SUPPLIED" } });

    if (pr.partId) {
      await tx.part.update({ where: { id: pr.partId }, data: { stockQuantity: { increment: pr.quantity } } });
      if (pr.workOrderId) {
        const part = await tx.part.findUniqueOrThrow({ where: { id: pr.partId } });
        await tx.workOrderPartUsed.create({
          data: {
            workOrderId: pr.workOrderId,
            partId: part.id,
            partName: part.name,
            quantity: pr.quantity,
            unitCostSar: order.unitCostSar ?? part.unitCostSar,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: { orgId: session.orgId, userId: session.userId, action: "SUPPLIED", entityType: "PurchaseOrder", entityId: order.id },
    });
  });

  revalidatePath(`/app/procurement/orders/${order.id}`);
  revalidatePath("/app/procurement");
  revalidatePath("/app/inventory");
}
