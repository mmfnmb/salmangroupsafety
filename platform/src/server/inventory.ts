"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createPart(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const name = str(formData, "name");
  if (!name) throw new Error("Part name is required");

  await prisma.part.create({
    data: {
      orgId: session.orgId,
      name,
      partNumber: str(formData, "partNumber"),
      brand: str(formData, "brand"),
      supplierName: str(formData, "supplierName"),
      store: str(formData, "store"),
      unitCostSar: str(formData, "unitCostSar") ? Number(str(formData, "unitCostSar")) : null,
      stockQuantity: str(formData, "stockQuantity") ? Number(str(formData, "stockQuantity")) : 0,
      minStockQuantity: str(formData, "minStockQuantity") ? Number(str(formData, "minStockQuantity")) : 0,
      compatibleWith: str(formData, "compatibleWith"),
    },
  });

  revalidatePath("/app/inventory");
}

export async function restockPart(partId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const part = await prisma.part.findFirst({ where: { id: partId, orgId: session.orgId } });
  if (!part) throw new Error("Part not found");

  const addQty = Number(str(formData, "addQuantity") ?? "0");
  if (!Number.isFinite(addQty) || addQty <= 0) throw new Error("Enter a positive quantity to add");

  await prisma.part.update({ where: { id: part.id }, data: { stockQuantity: { increment: addQty } } });
  revalidatePath("/app/inventory");
}

export async function addPartUsedToWorkOrder(workOrderId: string, formData: FormData) {
  const session = await requireOrgSession();

  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, orgId: session.orgId } });
  if (!wo) throw new Error("Work order not found");

  const quantity = Number(str(formData, "quantity") ?? "1");
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Enter a positive quantity");

  const partId = str(formData, "partId");

  await prisma.$transaction(async (tx) => {
    if (partId) {
      const part = await tx.part.findFirst({ where: { id: partId, orgId: session.orgId } });
      if (!part) throw new Error("Invalid part");
      if (part.stockQuantity < quantity) {
        throw new Error(`Only ${part.stockQuantity} in stock for ${part.name}`);
      }
      await tx.part.update({ where: { id: part.id }, data: { stockQuantity: { decrement: quantity } } });
      await tx.workOrderPartUsed.create({
        data: { workOrderId, partId: part.id, partName: part.name, quantity, unitCostSar: part.unitCostSar },
      });
    } else {
      const partName = str(formData, "partName");
      if (!partName) throw new Error("Part name is required for a non-inventory item");
      await tx.workOrderPartUsed.create({
        data: {
          workOrderId,
          partName,
          quantity,
          unitCostSar: str(formData, "unitCostSar") ? Number(str(formData, "unitCostSar")) : null,
        },
      });
    }
  });

  revalidatePath(`/app/work-orders/${workOrderId}`);
}
