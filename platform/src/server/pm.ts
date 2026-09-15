"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { generateSchedulesForPlan, generateDueWorkOrders } from "@/lib/pm-engine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PMFrequency } from "@/generated/prisma/client";

export async function createPMPlan(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const assetId = String(formData.get("assetId") ?? "");
  const asset = await prisma.asset.findFirst({ where: { id: assetId, orgId: session.orgId } });
  if (!asset) throw new Error("Invalid asset");

  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "MONTHLY") as PMFrequency;
  const intervalValue = Number(formData.get("intervalValue") ?? 1) || 1;
  const checklistId = String(formData.get("checklistId") ?? "") || null;
  const assignedTechnicianId = String(formData.get("assignedTechnicianId") ?? "") || null;
  const estimatedDurationMinutes = formData.get("estimatedDurationMinutes")
    ? Number(formData.get("estimatedDurationMinutes"))
    : null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;

  if (!name) throw new Error("Plan name is required");

  const plan = await prisma.pMPlan.create({
    data: {
      orgId: session.orgId,
      assetId,
      name,
      frequency,
      intervalValue,
      checklistId: checklistId ?? undefined,
      assignedTechnicianId: assignedTechnicianId ?? undefined,
      estimatedDurationMinutes,
      instructions,
    },
  });

  await generateSchedulesForPlan(plan.id);

  revalidatePath("/app/pm");
  revalidatePath(`/app/assets/${assetId}`);
  redirect("/app/pm");
}

export async function generateDuePM() {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");
  const created = await generateDueWorkOrders(session.orgId);
  revalidatePath("/app/pm");
  revalidatePath("/app/work-orders");
  return created;
}
