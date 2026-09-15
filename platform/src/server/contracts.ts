"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function createContract(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const contractNumber = String(formData.get("contractNumber") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!contractNumber || !type || !startDate || !endDate) {
    throw new Error("Contract number, type, start and end dates are required");
  }

  const valueRaw = formData.get("valueSar");

  await prisma.contract.create({
    data: {
      orgId: session.orgId,
      contractNumber,
      type,
      scope: String(formData.get("scope") ?? "").trim() || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      valueSar: valueRaw ? Number(valueRaw) : null,
    },
  });

  revalidatePath("/app/contracts");
}
