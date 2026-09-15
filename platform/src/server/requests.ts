"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { nextRequestReference, nextWorkOrderNumber } from "@/lib/numbering";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RequestPriority, RequestSource } from "@/generated/prisma/client";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Public entry point — reachable from the QR scan page or an org's public
 * request portal, with no authentication. orgId/siteId/assetId arrive as
 * hidden fields from a page we rendered ourselves, but we still verify the
 * site/asset actually belong to that org before writing anything.
 */
export async function createPublicRequest(formData: FormData) {
  const orgId = str(formData, "orgId");
  const siteId = str(formData, "siteId");
  const assetId = str(formData, "assetId");
  const description = str(formData, "description");
  const requesterName = str(formData, "requesterName");
  if (!orgId || !siteId || !description || !requesterName) {
    throw new Error("Missing required fields");
  }

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId } });
  if (!site) throw new Error("Invalid site");

  if (assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: assetId, orgId, siteId } });
    if (!asset) throw new Error("Invalid asset");
  }

  const referenceNumber = await nextRequestReference(orgId);

  await prisma.maintenanceRequest.create({
    data: {
      orgId,
      referenceNumber,
      siteId,
      assetId: assetId ?? undefined,
      requesterName,
      requesterPhone: str(formData, "requesterPhone"),
      requesterEmail: str(formData, "requesterEmail"),
      category: str(formData, "category"),
      description,
      priority: (str(formData, "priority") as RequestPriority) ?? "NORMAL",
      source: (str(formData, "source") as RequestSource) ?? "PUBLIC_PORTAL",
    },
  });

  redirect(`/r/thank-you?ref=${referenceNumber}`);
}

/** Internal portal: an authenticated org user reporting an issue. */
export async function createInternalRequest(formData: FormData) {
  const session = await requireOrgSession();
  const siteId = str(formData, "siteId");
  const description = str(formData, "description");
  if (!siteId || !description) throw new Error("Site and description are required");

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId: session.orgId } });
  if (!site) throw new Error("Invalid site");

  const assetId = str(formData, "assetId");
  if (assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: assetId, orgId: session.orgId, siteId } });
    if (!asset) throw new Error("Invalid asset");
  }

  const referenceNumber = await nextRequestReference(session.orgId);

  const request = await prisma.maintenanceRequest.create({
    data: {
      orgId: session.orgId,
      referenceNumber,
      siteId,
      assetId: assetId ?? undefined,
      requesterName: str(formData, "requesterName") ?? "Internal user",
      requesterUserId: session.userId,
      category: str(formData, "category"),
      description,
      priority: (str(formData, "priority") as RequestPriority) ?? "NORMAL",
      source: "INTERNAL_PORTAL",
    },
  });

  revalidatePath("/app/requests");
  redirect(`/app/requests/${request.id}`);
}

/** Converts a triaged request into a work order (facility manager / supervisor action). */
export async function convertRequestToWorkOrder(requestId: string) {
  const session = await requireOrgSession();

  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, orgId: session.orgId },
  });
  if (!request) throw new Error("Request not found");
  if (request.status === "CONVERTED") throw new Error("Already converted");

  const number = await nextWorkOrderNumber(session.orgId);

  const workOrder = await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.create({
      data: {
        orgId: session.orgId,
        number,
        requestId: request.id,
        siteId: request.siteId,
        assetId: request.assetId,
        category: request.category,
        priority: request.priority,
        description: request.description,
        type: "CORRECTIVE",
      },
    });
    await tx.maintenanceRequest.update({ where: { id: request.id }, data: { status: "CONVERTED" } });
    return wo;
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "CONVERT_TO_WORK_ORDER",
      entityType: "MaintenanceRequest",
      entityId: request.id,
      newValue: { workOrderId: workOrder.id, workOrderNumber: workOrder.number },
    },
  });

  revalidatePath("/app/requests");
  revalidatePath("/app/work-orders");
  redirect(`/app/work-orders/${workOrder.id}`);
}

export async function rejectRequest(requestId: string) {
  const session = await requireOrgSession();
  await prisma.maintenanceRequest.updateMany({
    where: { id: requestId, orgId: session.orgId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/app/requests");
}
