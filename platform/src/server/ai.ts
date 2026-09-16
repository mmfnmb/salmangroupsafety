"use server";

import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  isAiConfigured,
  AiNotConfiguredError,
  triageRequest,
  draftScopeOfWork,
  narrateQuotationRecommendation,
  type TriageSuggestion,
} from "@/lib/ai";

type AiResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "error"; message?: string };

export async function aiStatus(): Promise<{ configured: boolean }> {
  return { configured: isAiConfigured() };
}

export async function aiTriageRequest(requestId: string): Promise<AiResult<TriageSuggestion>> {
  const session = await requireOrgSession();
  const request = await prisma.maintenanceRequest.findFirst({ where: { id: requestId, orgId: session.orgId } });
  if (!request) return { ok: false, reason: "error", message: "Request not found" };

  try {
    const data = await triageRequest(request.description);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "AI request failed" };
  }
}

export async function aiDraftScopeOfWork(input: {
  assetName: string;
  problem: string;
  category?: string | null;
}): Promise<AiResult<string>> {
  await requireOrgSession();
  try {
    const data = await draftScopeOfWork(input);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "AI request failed" };
  }
}

export async function aiNarrateRfqRecommendation(rfqId: string): Promise<AiResult<string>> {
  const session = await requireOrgSession();
  const rfq = await prisma.rfq.findFirst({
    where: { id: rfqId, orgId: session.orgId },
    include: { quotations: { include: { vendor: true } } },
  });
  if (!rfq) return { ok: false, reason: "error", message: "RFQ not found" };

  const qualifying = rfq.quotations.filter((q) => q.technicalScore != null && q.technicalScore >= 70);
  if (qualifying.length === 0) return { ok: false, reason: "error", message: "No qualifying quotations to compare yet" };

  const best = qualifying.reduce((a, b) => ((a.technicalScore ?? 0) > (b.technicalScore ?? 0) ? a : b));

  try {
    const data = await narrateQuotationRecommendation({
      quotes: qualifying.map((q) => ({
        vendorName: q.vendor.name,
        totalCostSar: q.totalCostSar ? Number(q.totalCostSar) : null,
        technicalScore: q.technicalScore,
        bestValueScore: null,
      })),
      recommendedVendorName: best.vendor.name,
    });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "AI request failed" };
  }
}
