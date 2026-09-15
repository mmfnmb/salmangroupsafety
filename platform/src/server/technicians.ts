"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function createTechnician(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const trade = String(formData.get("trade") ?? "").trim();
  if (!name || !trade) throw new Error("Name and trade are required");

  const siteId = String(formData.get("siteId") ?? "");

  await prisma.technician.create({
    data: {
      orgId: session.orgId,
      name,
      nameAr: String(formData.get("nameAr") ?? "").trim() || null,
      trade,
      employeeId: String(formData.get("employeeId") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      sites: siteId ? { create: [{ siteId }] } : undefined,
    },
  });

  revalidatePath("/app/technicians");
}
