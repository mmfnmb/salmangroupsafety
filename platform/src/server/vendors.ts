"use server";

import { prisma } from "@/lib/prisma";
import { requirePlatformSession, requireVendorSession, requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { VendorStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { TIMESTAMP_FOR_STATUS } from "@/lib/work-order-timestamps";

const VENDOR_ALLOWED_STATUSES: WorkOrderStatus[] = [
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SITE",
  "DIAGNOSIS",
  "IN_PROGRESS",
  "TESTING",
  "COMPLETED",
];

export async function vendorUpdateJobStatus(workOrderId: string, status: WorkOrderStatus) {
  const session = await requireVendorSession();
  if (!VENDOR_ALLOWED_STATUSES.includes(status)) throw new Error("Not a valid vendor-side status");

  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, assignedVendorId: session.vendorId } });
  if (!wo) throw new Error("Work order not found");

  const timestampField = TIMESTAMP_FOR_STATUS[status];
  await prisma.workOrder.update({
    where: { id: wo.id },
    data: { status, ...(timestampField ? { [timestampField]: new Date() } : {}) },
  });

  revalidatePath("/vendor-portal");
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function registerVendor(formData: FormData) {
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase() ?? null;
  const phone = str(formData, "phone");
  const password = str(formData, "password");
  const categories = formData.getAll("categories").map(String);
  const coverageCities = formData.getAll("coverageCities").map(String);

  if (!name || !email || !phone || !password) {
    throw new Error("Company name, email, phone and password are required");
  }
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        name,
        nameAr: str(formData, "nameAr"),
        crNumber: str(formData, "crNumber"),
        vatNumber: str(formData, "vatNumber"),
        phone,
        email,
        website: str(formData, "website"),
        categories,
        coverageCities,
        emergencyAvailable: formData.get("emergencyAvailable") === "on",
        status: "PENDING",
      },
    });
    await tx.user.create({
      data: { email, passwordHash, name: `${name} — Owner`, role: "VENDOR_OWNER", vendorId: vendor.id },
    });
  });

  redirect("/join-network/thank-you");
}

export async function updateVendorProfile(formData: FormData) {
  const session = await requireVendorSession();

  const categories = formData.getAll("categories").map(String);
  const coverageCities = formData.getAll("coverageCities").map(String);

  await prisma.vendor.update({
    where: { id: session.vendorId },
    data: {
      nameAr: str(formData, "nameAr"),
      address: str(formData, "address"),
      website: str(formData, "website"),
      categories,
      coverageCities,
      emergencyAvailable: formData.get("emergencyAvailable") === "on",
    },
  });

  revalidatePath("/vendor-portal");
}

export async function addVendorDocument(formData: FormData) {
  const session = await requireVendorSession();

  const name = str(formData, "name");
  const type = str(formData, "type");
  const url = str(formData, "url");
  if (!name || !type || !url) throw new Error("Document name, type and URL are required");

  const expiry = str(formData, "expiryDate");

  await prisma.vendorDocument.create({
    data: {
      vendorId: session.vendorId,
      name,
      type,
      url,
      expiryDate: expiry ? new Date(expiry) : null,
    },
  });

  revalidatePath("/vendor-portal");
}

export async function setVendorStatus(vendorId: string, status: VendorStatus) {
  await requirePlatformSession();
  await prisma.vendor.update({ where: { id: vendorId }, data: { status } });
  revalidatePath("/platform/vendors");
}

export async function toggleVendorBlacklist(vendorId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const existing = await prisma.vendorBlacklistEntry.findUnique({
    where: { orgId_vendorId: { orgId: session.orgId, vendorId } },
  });

  if (existing) {
    await prisma.vendorBlacklistEntry.delete({ where: { id: existing.id } });
  } else {
    await prisma.vendorBlacklistEntry.create({
      data: { orgId: session.orgId, vendorId, reason: str(formData, "reason") },
    });
  }

  revalidatePath("/app/vendors");
}
