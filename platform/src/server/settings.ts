"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg, CUSTOMER_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Industry, RequestPriority, UserRole } from "@/generated/prisma/client";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function requireManager(role: UserRole) {
  if (!canManageOrg(role)) throw new Error("You do not have permission to change organization settings");
}

export async function updateOrgProfile(formData: FormData) {
  const session = await requireOrgSession();
  requireManager(session.role);

  const name = str(formData, "name");
  if (!name) throw new Error("Organization name is required");

  await prisma.organization.update({
    where: { id: session.orgId },
    data: {
      name,
      nameAr: str(formData, "nameAr"),
      city: str(formData, "city"),
      crNumber: str(formData, "crNumber"),
      vatNumber: str(formData, "vatNumber"),
      industry: (str(formData, "industry") as Industry) ?? undefined,
    },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app", "layout");
}

export async function upsertSlaPolicy(formData: FormData) {
  const session = await requireOrgSession();
  requireManager(session.role);

  const priority = str(formData, "priority") as RequestPriority | null;
  if (!priority) throw new Error("Priority is required");

  const responseMinutes = Number(str(formData, "responseMinutes") ?? "0");
  const arrivalMinutes = Number(str(formData, "arrivalMinutes") ?? "0");
  const resolutionMinutes = Number(str(formData, "resolutionMinutes") ?? "0");
  if (![responseMinutes, arrivalMinutes, resolutionMinutes].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("Response, arrival and resolution times must be positive numbers");
  }

  await prisma.slaPolicy.upsert({
    where: { orgId_priority: { orgId: session.orgId, priority } },
    create: {
      orgId: session.orgId,
      priority,
      name: `${priority} SLA`,
      responseMinutes,
      arrivalMinutes,
      resolutionMinutes,
    },
    update: { responseMinutes, arrivalMinutes, resolutionMinutes },
  });

  revalidatePath("/app/settings");
}

export async function createApprovalThreshold(formData: FormData) {
  const session = await requireOrgSession();
  requireManager(session.role);

  const minAmountSar = Number(str(formData, "minAmountSar") ?? "0");
  const maxAmountRaw = str(formData, "maxAmountSar");
  const requiredRole = str(formData, "requiredRole") as UserRole | null;
  const scope = str(formData, "scope");
  if (!Number.isFinite(minAmountSar) || !requiredRole || !scope) {
    throw new Error("Minimum amount, required role and scope are required");
  }

  await prisma.approvalThreshold.create({
    data: {
      orgId: session.orgId,
      minAmountSar,
      maxAmountSar: maxAmountRaw ? Number(maxAmountRaw) : null,
      requiredRole,
      scope,
    },
  });

  revalidatePath("/app/settings");
}

export async function deleteApprovalThreshold(thresholdId: string) {
  const session = await requireOrgSession();
  requireManager(session.role);
  await prisma.approvalThreshold.deleteMany({ where: { id: thresholdId, orgId: session.orgId } });
  revalidatePath("/app/settings");
}

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

export async function inviteTeamMember(formData: FormData) {
  const session = await requireOrgSession();
  requireManager(session.role);

  const email = str(formData, "email")?.toLowerCase();
  const name = str(formData, "name");
  const role = str(formData, "role") as UserRole | null;
  if (!email || !name || !role || !CUSTOMER_ROLES.includes(role)) {
    throw new Error("Name, email and a valid role are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists");

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.create({
    data: { orgId: session.orgId, email, name, passwordHash, role, status: "INVITED" },
  });

  revalidatePath("/app/settings");
  redirect(`/app/settings?invited=${encodeURIComponent(email)}&tempPassword=${encodeURIComponent(tempPassword)}#team`);
}

export async function suspendTeamMember(userId: string) {
  const session = await requireOrgSession();
  requireManager(session.role);
  await prisma.user.updateMany({
    where: { id: userId, orgId: session.orgId },
    data: { status: "SUSPENDED" },
  });
  revalidatePath("/app/settings");
}

export async function reactivateTeamMember(userId: string) {
  const session = await requireOrgSession();
  requireManager(session.role);
  await prisma.user.updateMany({
    where: { id: userId, orgId: session.orgId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/app/settings");
}
