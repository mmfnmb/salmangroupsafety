"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { TIMESTAMP_FOR_STATUS } from "@/lib/work-order-timestamps";
import type { WorkOrderStatus } from "@/generated/prisma/client";

const SUPERVISORY_ROLES = [
  "ACCOUNT_OWNER",
  "FACILITY_MANAGER",
  "MAINTENANCE_MANAGER",
  "MAINTENANCE_SUPERVISOR",
] as const;

async function getScopedWorkOrder(id: string, orgId: string) {
  const wo = await prisma.workOrder.findFirst({ where: { id, orgId } });
  if (!wo) throw new Error("Work order not found");
  return wo;
}

function canActOn(role: string, wo: { assignedTechnicianId: string | null }, technicianId: string | null) {
  if ((SUPERVISORY_ROLES as readonly string[]).includes(role)) return true;
  if (role === "TECHNICIAN" && technicianId && wo.assignedTechnicianId === technicianId) return true;
  return false;
}

export async function assignTechnician(workOrderId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) {
    throw new Error("Not authorized to assign technicians");
  }
  const wo = await getScopedWorkOrder(workOrderId, session.orgId);
  const technicianId = String(formData.get("technicianId") ?? "");
  const technician = await prisma.technician.findFirst({ where: { id: technicianId, orgId: session.orgId } });
  if (!technician) throw new Error("Invalid technician");

  await prisma.workOrder.update({
    where: { id: wo.id },
    data: {
      assignedTechnicianId: technician.id,
      status: wo.status === "NEW" ? "ASSIGNED" : wo.status,
      respondedAt: wo.respondedAt ?? new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "ASSIGN_TECHNICIAN",
      entityType: "WorkOrder",
      entityId: wo.id,
      newValue: { technicianId: technician.id },
    },
  });

  revalidatePath(`/app/work-orders/${wo.id}`);
  revalidatePath("/app/work-orders");
}

export async function assignVendor(workOrderId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!(SUPERVISORY_ROLES as readonly string[]).includes(session.role)) {
    throw new Error("Not authorized to assign vendors");
  }
  const wo = await getScopedWorkOrder(workOrderId, session.orgId);
  const vendorId = String(formData.get("vendorId") ?? "");

  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, status: "APPROVED" } });
  if (!vendor) throw new Error("Invalid or unapproved vendor");

  const blacklisted = await prisma.vendorBlacklistEntry.findUnique({
    where: { orgId_vendorId: { orgId: session.orgId, vendorId } },
  });
  if (blacklisted) throw new Error("This vendor is blacklisted for your organization");

  await prisma.workOrder.update({
    where: { id: wo.id },
    data: {
      assignedVendorId: vendor.id,
      assignedTechnicianId: null,
      status: wo.status === "NEW" ? "ASSIGNED" : wo.status,
      respondedAt: wo.respondedAt ?? new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "ASSIGN_VENDOR",
      entityType: "WorkOrder",
      entityId: wo.id,
      newValue: { vendorId: vendor.id, vendorName: vendor.name },
    },
  });

  revalidatePath(`/app/work-orders/${wo.id}`);
  revalidatePath("/app/work-orders");
}

export async function updateWorkOrderStatus(workOrderId: string, status: WorkOrderStatus) {
  const session = await requireOrgSession();
  const technician = await prisma.technician.findFirst({ where: { userId: session.userId } });
  const wo = await getScopedWorkOrder(workOrderId, session.orgId);
  if (!canActOn(session.role, wo, technician?.id ?? null)) throw new Error("Not authorized");

  const timestampField = TIMESTAMP_FOR_STATUS[status];
  await prisma.workOrder.update({
    where: { id: wo.id },
    data: {
      status,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    },
  });

  revalidatePath(`/app/work-orders/${wo.id}`);
  revalidatePath("/app/work-orders");
}

export async function completeWorkOrder(workOrderId: string, formData: FormData) {
  const session = await requireOrgSession();
  const technician = await prisma.technician.findFirst({ where: { userId: session.userId } });
  const wo = await getScopedWorkOrder(workOrderId, session.orgId);
  if (!canActOn(session.role, wo, technician?.id ?? null)) throw new Error("Not authorized");

  const rootCause = String(formData.get("rootCause") ?? "").trim() || null;
  const correctiveAction = String(formData.get("correctiveAction") ?? "").trim() || null;
  const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
  const laborCostRaw = formData.get("laborCostSar");
  const partsCostRaw = formData.get("partsCostSar");
  const laborCostSar = laborCostRaw ? Number(laborCostRaw) : null;
  const partsCostSar = partsCostRaw ? Number(partsCostRaw) : null;
  const totalCostSar = laborCostSar != null || partsCostSar != null ? (laborCostSar ?? 0) + (partsCostSar ?? 0) : null;
  const safetyIncidentReported = formData.get("safetyIncidentReported") === "on";

  await prisma.workOrder.update({
    where: { id: wo.id },
    data: {
      status: "COMPLETED",
      completedAt: wo.completedAt ?? new Date(),
      rootCause,
      correctiveAction,
      recommendation,
      laborCostSar,
      partsCostSar,
      totalCostSar,
      safetyIncidentReported,
    },
  });

  if (wo.assetId) {
    const conditionRaw = String(formData.get("assetConditionAfter") ?? "");
    if (conditionRaw) {
      await prisma.asset.update({ where: { id: wo.assetId }, data: { condition: conditionRaw as never } });
    }
  }

  if (wo.pmScheduleId) {
    await prisma.pMSchedule.update({ where: { id: wo.pmScheduleId }, data: { status: "COMPLETED" } });
  }

  const checklistId = String(formData.get("checklistId") ?? "");
  if (checklistId) {
    const responses: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("checklist_")) responses[key.replace("checklist_", "")] = String(value);
    }
    await prisma.checklistResponse.create({
      data: { workOrderId: wo.id, checklistId, responses, submittedAt: new Date() },
    });
  }

  revalidatePath(`/app/work-orders/${wo.id}`);
  revalidatePath("/app/work-orders");
  revalidatePath("/app/pm");
}

export async function customerSignoff(workOrderId: string, formData: FormData) {
  const session = await requireOrgSession();
  const wo = await getScopedWorkOrder(workOrderId, session.orgId);

  const decision = String(formData.get("decision") ?? "");
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;

  if (!["APPROVED", "REJECTED", "REOPENED"].includes(decision)) throw new Error("Invalid decision");

  await prisma.workOrder.update({
    where: { id: wo.id },
    data: {
      customerSignoffAt: new Date(),
      customerSignoffStatus: decision,
      customerRating: rating,
      status: decision === "REOPENED" ? "REOPENED" : decision === "APPROVED" ? "CLOSED" : "CUSTOMER_VERIFICATION",
      closedAt: decision === "APPROVED" ? new Date() : wo.closedAt,
    },
  });

  revalidatePath(`/app/work-orders/${wo.id}`);
}
