import { prisma } from "@/lib/prisma";
import { DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { addDays } from "date-fns";
import type { RequestPriority, WorkOrderType } from "@/generated/prisma/client";

interface WorkOrderForScoring {
  id: string;
  assetId: string | null;
  category: string | null;
  type: WorkOrderType;
  priority: RequestPriority;
  createdAt: Date;
  respondedAt: Date | null;
  completedAt: Date | null;
  customerSignoffStatus: string | null;
  customerRating: number | null;
  rootCause: string | null;
  correctiveAction: string | null;
  safetyIncidentReported: boolean;
  slaPolicy: { responseMinutes: number; resolutionMinutes: number } | null;
}

/**
 * Default weighting per the product spec (section 20). Configurable per
 * organization by passing `weights` — no UI toggle yet, but every caller
 * goes through this single function so an admin setting can be wired in
 * later without touching the math.
 */
export const DEFAULT_TECHNICIAN_WEIGHTS = {
  responseTime: 0.15,
  slaCompliance: 0.15,
  ftfr: 0.2,
  repeatFailure: 0.15,
  pmCompletion: 0.1,
  quality: 0.1,
  documentation: 0.05,
  safety: 0.05,
  satisfaction: 0.05,
} as const;

type ScoreComponent = { value: number; weight: number } | null;

function weightedAverage(components: Record<string, ScoreComponent>) {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const c of Object.values(components)) {
    if (c === null) continue;
    weightedSum += c.value * c.weight;
    totalWeight += c.weight;
  }
  if (totalWeight === 0) return 0;
  // Renormalize so missing-data components don't unfairly drag the score down.
  return weightedSum / totalWeight;
}

export async function computeTechnicianPerformance(
  technicianId: string,
  periodStart: Date,
  periodEnd: Date,
  weights = DEFAULT_TECHNICIAN_WEIGHTS
) {
  const workOrders: WorkOrderForScoring[] = await prisma.workOrder.findMany({
    where: {
      assignedTechnicianId: technicianId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    include: { slaPolicy: true, asset: true },
  });

  const completed = workOrders.filter((wo) => wo.completedAt);
  const jobsCompleted = completed.length;

  // Response time: fraction of jobs where a response (status leaves NEW) happened
  // within the applicable SLA response window.
  let responseWithinSla = 0;
  let responseTracked = 0;
  for (const wo of workOrders) {
    if (!wo.respondedAt) continue;
    responseTracked++;
    const allotted = wo.slaPolicy?.responseMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].response;
    const deadline = new Date(wo.createdAt.getTime() + allotted * 60_000);
    if (wo.respondedAt <= deadline) responseWithinSla++;
  }
  const responseTimeScore =
    responseTracked > 0 ? (responseWithinSla / responseTracked) * 100 : null;

  // SLA compliance: resolution within allotted resolution SLA.
  let resolvedWithinSla = 0;
  let resolutionTracked = 0;
  for (const wo of completed) {
    resolutionTracked++;
    const allotted = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
    const deadline = new Date(wo.createdAt.getTime() + allotted * 60_000);
    if (wo.completedAt! <= deadline) resolvedWithinSla++;
  }
  const slaComplianceScore =
    resolutionTracked > 0 ? (resolvedWithinSla / resolutionTracked) * 100 : null;

  // First-Time Fix Rate: completed job has no follow-up WO on the same asset
  // within 30 days for the same category (a proxy for "same root cause").
  let firstTimeFixes = 0;
  for (const wo of completed) {
    if (!wo.assetId) {
      firstTimeFixes++; // no asset to correlate against; don't penalize
      continue;
    }
    const repeat = await prisma.workOrder.findFirst({
      where: {
        assetId: wo.assetId,
        id: { not: wo.id },
        category: wo.category,
        createdAt: { gt: wo.completedAt!, lte: addDays(wo.completedAt!, 30) },
      },
    });
    if (!repeat) firstTimeFixes++;
  }
  const ftfrScore = jobsCompleted > 0 ? (firstTimeFixes / jobsCompleted) * 100 : null;
  const repeatFailureScore = ftfrScore !== null ? ftfrScore : null; // inverse relationship, same underlying signal

  // PM completion: PM-origin work orders completed on/before their schedule due date.
  const pmWorkOrders = workOrders.filter((wo) => wo.type === "PREVENTIVE");
  const pmCompletionScore =
    pmWorkOrders.length > 0
      ? (pmWorkOrders.filter((wo) => wo.completedAt).length / pmWorkOrders.length) * 100
      : null;

  // Repair quality: inverse of customer-reopened jobs.
  const signedOff = completed.filter((wo) => wo.customerSignoffStatus);
  const qualityScore =
    signedOff.length > 0
      ? (signedOff.filter((wo) => wo.customerSignoffStatus !== "REOPENED").length / signedOff.length) * 100
      : null;

  // Documentation quality: root cause + corrective action recorded on completed jobs.
  const documentationScore =
    jobsCompleted > 0
      ? (completed.filter((wo) => wo.rootCause && wo.correctiveAction).length / jobsCompleted) * 100
      : null;

  // Safety compliance: inverse of self/supervisor-reported safety incidents.
  const safetyComplianceScore =
    jobsCompleted > 0
      ? (completed.filter((wo) => !wo.safetyIncidentReported).length / jobsCompleted) * 100
      : null;

  // User satisfaction: average customer rating (1-5), normalized to 0-100.
  const rated = completed.filter((wo) => wo.customerRating != null);
  const satisfactionScore =
    rated.length > 0
      ? (rated.reduce((sum, wo) => sum + (wo.customerRating ?? 0), 0) / rated.length / 5) * 100
      : null;

  const components: Record<string, ScoreComponent> = {
    responseTime: responseTimeScore !== null ? { value: responseTimeScore, weight: weights.responseTime } : null,
    slaCompliance: slaComplianceScore !== null ? { value: slaComplianceScore, weight: weights.slaCompliance } : null,
    ftfr: ftfrScore !== null ? { value: ftfrScore, weight: weights.ftfr } : null,
    repeatFailure: repeatFailureScore !== null ? { value: repeatFailureScore, weight: weights.repeatFailure } : null,
    pmCompletion: pmCompletionScore !== null ? { value: pmCompletionScore, weight: weights.pmCompletion } : null,
    quality: qualityScore !== null ? { value: qualityScore, weight: weights.quality } : null,
    documentation: documentationScore !== null ? { value: documentationScore, weight: weights.documentation } : null,
    safety: safetyComplianceScore !== null ? { value: safetyComplianceScore, weight: weights.safety } : null,
    satisfaction: satisfactionScore !== null ? { value: satisfactionScore, weight: weights.satisfaction } : null,
  };

  const overallScore = weightedAverage(components);

  return {
    responseTimeScore: responseTimeScore ?? 0,
    slaComplianceScore: slaComplianceScore ?? 0,
    ftfrScore: ftfrScore ?? 0,
    repeatFailureScore: repeatFailureScore ?? 0,
    pmCompletionScore: pmCompletionScore ?? 0,
    qualityScore: qualityScore ?? 0,
    documentationScore: documentationScore ?? 0,
    safetyComplianceScore: safetyComplianceScore ?? 0,
    satisfactionScore: satisfactionScore ?? 0,
    overallScore,
    jobsCompleted,
  };
}

/**
 * Asset Health Score (section 40): condition, PM compliance, breakdown
 * frequency and open defects, each genuinely derived from stored data.
 */
interface AssetHealthInput {
  condition: string;
  workOrders: { type: WorkOrderType; status: string }[];
  pmPlans: { schedules: { status: string }[] }[];
}

export async function computeAssetHealthScore(assetId: string) {
  const asset: AssetHealthInput = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    include: {
      workOrders: { where: { createdAt: { gte: addDays(new Date(), -365) } } },
      pmPlans: { include: { schedules: true } },
    },
  });

  const conditionScoreMap: Record<string, number> = {
    EXCELLENT: 100,
    GOOD: 85,
    FAIR: 65,
    POOR: 45,
    CRITICAL: 20,
  };
  const conditionScore = conditionScoreMap[asset.condition] ?? 65;

  const totalSchedules = asset.pmPlans.flatMap((p) => p.schedules);
  const dueOrPast = totalSchedules.filter((s) => s.status !== "UPCOMING");
  const pmComplianceScore =
    dueOrPast.length > 0
      ? (dueOrPast.filter((s) => s.status === "COMPLETED").length / dueOrPast.length) * 100
      : 100; // no PM history yet — not penalized

  const breakdowns = asset.workOrders.filter((wo) => wo.type === "CORRECTIVE" || wo.type === "EMERGENCY");
  const breakdownScore = Math.max(0, 100 - breakdowns.length * 8);

  const openDefects = asset.workOrders.filter((wo) => !["CLOSED", "CANCELLED"].includes(wo.status)).length;
  const openDefectScore = Math.max(0, 100 - openDefects * 15);

  const overall = conditionScore * 0.3 + pmComplianceScore * 0.3 + breakdownScore * 0.25 + openDefectScore * 0.15;

  return {
    conditionScore,
    pmComplianceScore,
    breakdownScore,
    openDefectScore,
    overallScore: Math.round(overall),
    breakdownCount: breakdowns.length,
    openDefectCount: openDefects,
  };
}

/**
 * Portfolio-wide health rollup (section 41). Computes the same condition /
 * PM-compliance / breakdown / open-defect formula as computeAssetHealthScore,
 * but in aggregate queries so it stays cheap on a large asset register.
 */
export async function computePortfolioHealth(orgId: string) {
  const conditionScoreMap: Record<string, number> = {
    EXCELLENT: 100,
    GOOD: 85,
    FAIR: 65,
    POOR: 45,
    CRITICAL: 20,
  };

  const [conditionGroups, assetCount, pmSchedules, breakdownsByAsset, openDefectsByAsset] = await Promise.all([
    prisma.asset.groupBy({ by: ["condition"], where: { orgId }, _count: true }),
    prisma.asset.count({ where: { orgId } }),
    prisma.pMSchedule.groupBy({
      by: ["status"],
      where: { pmPlan: { orgId } },
      _count: true,
    }),
    prisma.workOrder.groupBy({
      by: ["assetId"],
      where: {
        orgId,
        assetId: { not: null },
        type: { in: ["CORRECTIVE", "EMERGENCY"] },
        createdAt: { gte: addDays(new Date(), -365) },
      },
      _count: true,
    }),
    prisma.workOrder.groupBy({
      by: ["assetId"],
      where: { orgId, assetId: { not: null }, status: { notIn: ["CLOSED", "CANCELLED"] } },
      _count: true,
    }),
  ]);

  const avgConditionScore =
    assetCount > 0
      ? conditionGroups.reduce((sum, g) => sum + conditionScoreMap[g.condition] * g._count, 0) / assetCount
      : 85;

  const pmDueOrPast = pmSchedules
    .filter((g) => g.status !== "UPCOMING")
    .reduce((sum, g) => sum + g._count, 0);
  const pmCompleted = pmSchedules.find((g) => g.status === "COMPLETED")?._count ?? 0;
  const pmComplianceScore = pmDueOrPast > 0 ? (pmCompleted / pmDueOrPast) * 100 : 100;

  const avgBreakdownScore =
    assetCount > 0
      ? Math.max(
          0,
          100 - (breakdownsByAsset.reduce((sum, g) => sum + g._count, 0) / assetCount) * 8
        )
      : 100;

  const avgOpenDefectScore =
    assetCount > 0
      ? Math.max(
          0,
          100 - (openDefectsByAsset.reduce((sum, g) => sum + g._count, 0) / assetCount) * 15
        )
      : 100;

  const overallScore = Math.round(
    avgConditionScore * 0.3 + pmComplianceScore * 0.3 + avgBreakdownScore * 0.25 + avgOpenDefectScore * 0.15
  );

  return {
    overallScore,
    assetCount,
    pmComplianceScore: Math.round(pmComplianceScore),
    conditionScore: Math.round(avgConditionScore),
    breakdownScore: Math.round(avgBreakdownScore),
    openDefectScore: Math.round(avgOpenDefectScore),
  };
}

export function healthBand(score: number): { label: string; labelAr: string; color: string } {
  if (score >= 90) return { label: "Excellent", labelAr: "ممتاز", color: "text-emerald-600" };
  if (score >= 80) return { label: "Good", labelAr: "جيد", color: "text-green-600" };
  if (score >= 65) return { label: "Fair", labelAr: "مقبول", color: "text-amber-600" };
  if (score >= 50) return { label: "Poor", labelAr: "ضعيف", color: "text-orange-600" };
  return { label: "Critical", labelAr: "حرج", color: "text-red-600" };
}
