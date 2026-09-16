"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession, requireVendorSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { nextRfqNumber, nextWorkOrderNumber } from "@/lib/numbering";
import { computePlatformFee } from "@/lib/platform-fee";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SUPERVISORY_ROLES = ["ACCOUNT_OWNER", "FACILITY_MANAGER", "MAINTENANCE_MANAGER"] as const;
const SENIOR_ROLES = ["ACCOUNT_OWNER"] as const;

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createRfq(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized to create an RFQ");

  const siteId = str(formData, "siteId");
  const title = str(formData, "title");
  const scopeOfWork = str(formData, "scopeOfWork");
  if (!siteId || !title || !scopeOfWork) throw new Error("Site, title and scope of work are required");

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId: session.orgId } });
  if (!site) throw new Error("Invalid site");

  const assetId = str(formData, "assetId");
  if (assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: assetId, orgId: session.orgId, siteId } });
    if (!asset) throw new Error("Invalid asset");
  }

  const requestId = str(formData, "requestId");
  if (requestId) {
    const request = await prisma.maintenanceRequest.findFirst({ where: { id: requestId, orgId: session.orgId } });
    if (!request) throw new Error("Invalid request");
  }

  const number = await nextRfqNumber(session.orgId);
  const quoteDeadlineRaw = str(formData, "quoteDeadline");

  const rfq = await prisma.rfq.create({
    data: {
      orgId: session.orgId,
      number,
      siteId,
      assetId: assetId ?? undefined,
      requestId: requestId ?? undefined,
      title,
      category: str(formData, "category"),
      scopeOfWork,
      quoteDeadline: quoteDeadlineRaw ? new Date(quoteDeadlineRaw) : null,
      createdByUserId: session.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "CREATE",
      entityType: "Rfq",
      entityId: rfq.id,
      newValue: { number: rfq.number, title },
    },
  });

  revalidatePath("/app/rfq");
  redirect(`/app/rfq/${rfq.id}`);
}

export async function inviteVendors(rfqId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const rfq = await prisma.rfq.findFirst({ where: { id: rfqId, orgId: session.orgId } });
  if (!rfq) throw new Error("RFQ not found");

  const vendorIds = formData.getAll("vendorIds").map(String);
  if (vendorIds.length === 0) throw new Error("Select at least one vendor to invite");

  const blacklisted = await prisma.vendorBlacklistEntry.findMany({ where: { orgId: session.orgId } });
  const blacklistedIds = new Set(blacklisted.map((b) => b.vendorId));

  const vendors = await prisma.vendor.findMany({ where: { id: { in: vendorIds }, status: "APPROVED" } });
  const invitable = vendors.filter((v) => !blacklistedIds.has(v.id));
  if (invitable.length === 0) throw new Error("No eligible vendors selected");

  await prisma.$transaction([
    ...invitable.map((v) =>
      prisma.rfqVendor.upsert({
        where: { rfqId_vendorId: { rfqId: rfq.id, vendorId: v.id } },
        update: {},
        create: { rfqId: rfq.id, vendorId: v.id },
      })
    ),
    prisma.rfq.update({
      where: { id: rfq.id },
      data: { status: rfq.status === "DRAFT" ? "RELEASED" : rfq.status },
    }),
  ]);

  revalidatePath(`/app/rfq/${rfq.id}`);
}

export async function submitQuotation(rfqId: string, formData: FormData) {
  const session = await requireVendorSession();

  const invite = await prisma.rfqVendor.findFirst({ where: { rfqId, vendorId: session.vendorId } });
  if (!invite) throw new Error("Your company was not invited to this RFQ");

  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  if (rfq.status === "AWARDED" || rfq.status === "CANCELLED") throw new Error("This RFQ is no longer accepting quotes");

  const laborCostSar = str(formData, "laborCostSar") ? Number(str(formData, "laborCostSar")) : null;
  const materialsCostSar = str(formData, "materialsCostSar") ? Number(str(formData, "materialsCostSar")) : null;
  const totalCostSar =
    str(formData, "totalCostSar") != null
      ? Number(str(formData, "totalCostSar"))
      : (laborCostSar ?? 0) + (materialsCostSar ?? 0) || null;
  const validUntilRaw = str(formData, "validUntil");

  await prisma.quotation.upsert({
    where: { rfqId_vendorId: { rfqId, vendorId: session.vendorId } },
    update: {
      laborCostSar,
      materialsCostSar,
      totalCostSar,
      leadTimeDays: str(formData, "leadTimeDays") ? Number(str(formData, "leadTimeDays")) : null,
      warrantyMonths: str(formData, "warrantyMonths") ? Number(str(formData, "warrantyMonths")) : null,
      paymentTerms: str(formData, "paymentTerms"),
      exclusions: str(formData, "exclusions"),
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    create: {
      rfqId,
      vendorId: session.vendorId,
      laborCostSar,
      materialsCostSar,
      totalCostSar,
      leadTimeDays: str(formData, "leadTimeDays") ? Number(str(formData, "leadTimeDays")) : null,
      warrantyMonths: str(formData, "warrantyMonths") ? Number(str(formData, "warrantyMonths")) : null,
      paymentTerms: str(formData, "paymentTerms"),
      exclusions: str(formData, "exclusions"),
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
    },
  });

  if (rfq.status === "RELEASED") {
    await prisma.rfq.update({ where: { id: rfqId }, data: { status: "QUOTING" } });
  }

  revalidatePath(`/vendor-portal/rfq/${rfqId}`);
  revalidatePath("/vendor-portal");
}

export async function evaluateQuotation(quotationId: string, formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized");

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, rfq: { orgId: session.orgId } },
    include: { rfq: true },
  });
  if (!quotation) throw new Error("Quotation not found");

  const technicalScore = str(formData, "technicalScore") ? Number(str(formData, "technicalScore")) : null;
  if (technicalScore != null && (technicalScore < 0 || technicalScore > 100)) {
    throw new Error("Technical score must be between 0 and 100");
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      technicalScore,
      evaluationNotes: str(formData, "evaluationNotes"),
      status: "UNDER_EVALUATION",
    },
  });

  if (quotation.rfq.status === "QUOTING") {
    await prisma.rfq.update({ where: { id: quotation.rfqId }, data: { status: "EVALUATING" } });
  }

  revalidatePath(`/app/rfq/${quotation.rfqId}`);
}

export async function awardQuotation(rfqId: string, quotationId: string) {
  const session = await requireOrgSession();

  const rfq = await prisma.rfq.findFirst({ where: { id: rfqId, orgId: session.orgId } });
  if (!rfq) throw new Error("RFQ not found");
  if (rfq.status === "AWARDED") throw new Error("This RFQ has already been awarded");

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, rfqId } });
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.technicalScore == null || quotation.technicalScore < 70) {
    throw new Error("This quotation has not met the minimum technical qualification score");
  }

  const totalCost = Number(quotation.totalCostSar ?? 0);
  const threshold = await prisma.approvalThreshold.findFirst({
    where: { orgId: session.orgId, scope: "AWARD", minAmountSar: { lte: totalCost }, OR: [{ maxAmountSar: null }, { maxAmountSar: { gte: totalCost } }] },
    orderBy: { minAmountSar: "desc" },
  });
  const requiredRole = threshold?.requiredRole ?? (totalCost > 10_000 ? "ACCOUNT_OWNER" : "FACILITY_MANAGER");
  const allowedRoles: string[] =
    requiredRole === "ACCOUNT_OWNER" ? [...SENIOR_ROLES] : [...SUPERVISORY_ROLES];
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Awarding a contract of this value requires ${requiredRole.replace("_", " ").toLowerCase()} approval`);
  }

  const fee = computePlatformFee(totalCost);
  const number = await nextWorkOrderNumber(session.orgId);

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: quotationId }, data: { status: "AWARDED" } });
    await tx.quotation.updateMany({
      where: { rfqId, id: { not: quotationId } },
      data: { status: "REJECTED" },
    });
    await tx.rfq.update({
      where: { id: rfqId },
      data: {
        status: "AWARDED",
        awardedVendorId: quotation.vendorId,
        awardedQuotationId: quotation.id,
        awardedAt: new Date(),
        awardedByUserId: session.userId,
        platformFeePercent: fee.percent,
        platformFeeSar: fee.feeSar,
      },
    });
    await tx.workOrder.create({
      data: {
        orgId: session.orgId,
        number,
        siteId: rfq.siteId,
        assetId: rfq.assetId,
        type: "CORRECTIVE",
        category: rfq.category,
        priority: "NORMAL",
        description: rfq.scopeOfWork,
        assignedVendorId: quotation.vendorId,
        status: "ASSIGNED",
        respondedAt: new Date(),
      },
    });
    if (rfq.requestId) {
      await tx.maintenanceRequest.updateMany({ where: { id: rfq.requestId }, data: { status: "CONVERTED" } });
    }
    await tx.auditLog.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        action: "AWARD_RFQ",
        entityType: "Rfq",
        entityId: rfq.id,
        newValue: { vendorId: quotation.vendorId, quotationId: quotation.id, totalCostSar: totalCost, platformFeePercent: fee.percent },
      },
    });
  });

  revalidatePath(`/app/rfq/${rfqId}`);
  revalidatePath("/app/work-orders");
  revalidatePath("/app/requests");
}
