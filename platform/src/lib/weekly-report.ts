import "server-only";
import { prisma } from "@/lib/prisma";
import { computePortfolioHealth, computeTechnicianPerformance } from "@/lib/scoring";
import { evaluateSlaStage, DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { subDays } from "date-fns";

export type WeeklyReportData = Awaited<ReturnType<typeof generateWeeklyReportData>>;

export async function generateWeeklyReportData(orgId: string, weekStart: Date, weekEnd: Date) {
  const [portfolio, workOrdersThisWeek, openWorkOrders, technicians] = await Promise.all([
    computePortfolioHealth(orgId),
    prisma.workOrder.findMany({
      where: { orgId, createdAt: { gte: weekStart, lte: weekEnd } },
      include: { slaPolicy: true },
    }),
    prisma.workOrder.findMany({
      where: { orgId, status: { notIn: ["CLOSED", "CANCELLED"] } },
      include: { asset: true, site: true, slaPolicy: true },
    }),
    prisma.technician.findMany({ where: { orgId, status: "ACTIVE" } }),
  ]);

  const closedThisWeek = workOrdersThisWeek.filter((wo) => wo.status === "CLOSED" || wo.completedAt);
  const overdue = openWorkOrders.filter((wo) => {
    const allotted = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
    return evaluateSlaStage({ createdAt: wo.createdAt, actualAt: wo.completedAt, allottedMinutes: allotted }) === "breached";
  });
  const emergency = openWorkOrders.filter((wo) => wo.priority === "EMERGENCY" || wo.priority === "CRITICAL");

  const resolvedForSla = workOrdersThisWeek.filter((wo) => wo.completedAt);
  const slaMet = resolvedForSla.filter((wo) => {
    const allotted = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
    return evaluateSlaStage({ createdAt: wo.createdAt, actualAt: wo.completedAt, allottedMinutes: allotted }) === "met";
  });
  const slaAchievement = resolvedForSla.length > 0 ? Math.round((slaMet.length / resolvedForSla.length) * 100) : null;

  const responded = workOrdersThisWeek.filter((wo) => wo.respondedAt);
  const avgResponseMinutes =
    responded.length > 0
      ? Math.round(
          responded.reduce((sum, wo) => sum + (wo.respondedAt!.getTime() - wo.createdAt.getTime()) / 60000, 0) /
            responded.length
        )
      : null;
  const avgResolutionMinutes =
    resolvedForSla.length > 0
      ? Math.round(
          resolvedForSla.reduce((sum, wo) => sum + (wo.completedAt!.getTime() - wo.createdAt.getTime()) / 60000, 0) /
            resolvedForSla.length
        )
      : null;

  const pmWorkOrders = workOrdersThisWeek.filter((wo) => wo.type === "PREVENTIVE");
  const correctiveWorkOrders = workOrdersThisWeek.filter((wo) => wo.type === "CORRECTIVE");

  const weeklyCost = workOrdersThisWeek.reduce((sum, wo) => sum + Number(wo.totalCostSar ?? 0), 0);
  const monthStart = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), 1);
  const mtdWorkOrders = await prisma.workOrder.findMany({
    where: { orgId, completedAt: { gte: monthStart, lte: weekEnd } },
    select: { totalCostSar: true },
  });
  const mtdCost = mtdWorkOrders.reduce((sum, wo) => sum + Number(wo.totalCostSar ?? 0), 0);
  const yearStart = new Date(weekEnd.getFullYear(), 0, 1);
  const ytdWorkOrders = await prisma.workOrder.findMany({
    where: { orgId, completedAt: { gte: yearStart, lte: weekEnd } },
    select: { totalCostSar: true },
  });
  const ytdCost = ytdWorkOrders.reduce((sum, wo) => sum + Number(wo.totalCostSar ?? 0), 0);

  const techScores = await Promise.all(
    technicians.map(async (t) => ({
      id: t.id,
      name: t.name,
      score: (await computeTechnicianPerformance(t.id, subDays(weekEnd, 90), weekEnd)).overallScore,
    }))
  );
  techScores.sort((a, b) => b.score - a.score);

  return {
    period: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    portfolio,
    workOrders: {
      opened: workOrdersThisWeek.length,
      closed: closedThisWeek.length,
      openTotal: openWorkOrders.length,
      overdue: overdue.length,
      emergencyOpen: emergency.length,
      preventive: pmWorkOrders.length,
      corrective: correctiveWorkOrders.length,
    },
    sla: {
      achievementPercent: slaAchievement,
      avgResponseMinutes,
      avgResolutionMinutes,
    },
    technicians: {
      best: techScores.slice(0, 3),
      needsAttention: techScores.filter((t) => t.score < 60).slice(0, 3),
    },
    finance: {
      weeklyCostSar: Math.round(weeklyCost),
      mtdCostSar: Math.round(mtdCost),
      ytdCostSar: Math.round(ytdCost),
    },
    criticalIssues: emergency.slice(0, 10).map((wo) => ({
      number: wo.number,
      description: wo.description,
      site: wo.site.name,
      asset: wo.asset?.assetCode ?? null,
      status: wo.status,
    })),
  };
}
