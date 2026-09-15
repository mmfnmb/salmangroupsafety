"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSite(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized to create sites");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!code || !name || !city) throw new Error("Code, name and city are required");

  const site = await prisma.site.create({
    data: { orgId: session.orgId, code, name, nameAr, city, address },
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "CREATE",
      entityType: "Site",
      entityId: site.id,
      newValue: { code, name, city },
    },
  });

  revalidatePath("/app/sites");
  redirect(`/app/sites/${site.id}`);
}

export async function createBuilding(siteId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId: session.orgId } });
  if (!site) throw new Error("Site not found");

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim() || null;
  if (!name) throw new Error("Building name is required");

  await prisma.building.create({ data: { siteId, name, nameAr } });
  revalidatePath(`/app/sites/${siteId}`);
}
