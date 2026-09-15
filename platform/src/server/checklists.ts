"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createChecklist(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const itemType = String(formData.get("itemType") ?? "PASS_FAIL");
  const required = formData.get("required") === "on";
  const linesRaw = String(formData.get("items") ?? "");
  const labels = linesRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!name || labels.length === 0) throw new Error("Name and at least one checklist item are required");

  const items = labels.map((label, i) => ({
    id: `item-${i + 1}`,
    label,
    type: itemType,
    required,
  }));

  await prisma.checklist.create({
    data: { orgId: session.orgId, name, items },
  });

  revalidatePath("/app/checklists");
  redirect(`/app/checklists`);
}
