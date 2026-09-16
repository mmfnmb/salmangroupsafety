import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { computePortfolioHealth, healthBand, computeTechnicianPerformance } from "@/lib/scoring";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthBreakdownChart } from "@/components/charts/health-breakdown-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { redirect } from "next/navigation";
import { subDays, addYears, subMonths, startOfMonth, format } from "date-fns";
import Link from "next/link";

export default async function ExecutiveDashboardPage() {
  const session = await requireOrgSession();
  if (session.role !== "ACCOUNT_OWNER") redirect("/app");

  const [health, openCritical, technicians, monthCost, assetsNearingEol, vendorCount] = await Promise.all([
    computePortfolioHealth(session.orgId),
    prisma.workOrder.findMany({
      where: { orgId: session.orgId, priority: { in: ["EMERGENCY", "CRITICAL"] }, status: { notIn: ["CLOSED", "CANCELLED"] } },
      include: { site: true, asset: true },
    }),
    prisma.technician.findMany({ where: { orgId: session.orgId, status: "ACTIVE" } }),
    prisma.workOrder.aggregate({
      where: { orgId: session.orgId, completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { totalCostSar: true },
    }),
    prisma.asset.findMany({
      where: {
        orgId: session.orgId,
        purchaseDate: { not: null },
        usefulLifeYears: { not: null },
        status: { not: "DECOMMISSIONED" },
      },
      select: { id: true, assetCode: true, name: true, purchaseDate: true, usefulLifeYears: true, replacementCostSar: true },
    }),
    prisma.vendor.count(),
  ]);

  const band = healthBand(health.overallScore);
  const now = new Date();
  const upcomingReplacements = assetsNearingEol
    .map((a) => ({ ...a, eolDate: addYears(a.purchaseDate!, a.usefulLifeYears!) }))
    .filter((a) => a.eolDate <= addYears(now, 1))
    .sort((a, b) => a.eolDate.getTime() - b.eolDate.getTime())
    .slice(0, 8);

  const techScores = await Promise.all(
    technicians.map(async (t) => ({ name: t.name, score: (await computeTechnicianPerformance(t.id, subDays(now, 90), now)).overallScore }))
  );
  const avgTechScore =
    techScores.length > 0 ? Math.round(techScores.reduce((s, t) => s + t.score, 0) / techScores.length) : null;

  const healthChartData = [
    { label: "Condition", score: health.conditionScore },
    { label: "PM Compliance", score: health.pmComplianceScore },
    { label: "Reliability", score: health.breakdownScore },
    { label: "Open Defects", score: health.openDefectScore },
  ];

  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const costWorkOrders = await prisma.workOrder.findMany({
    where: { orgId: session.orgId, completedAt: { gte: sixMonthsAgo }, totalCostSar: { not: null } },
    select: { completedAt: true, totalCostSar: true },
  });
  const costTrend = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(now, 5 - i));
    const monthCost = costWorkOrders
      .filter((wo) => wo.completedAt && startOfMonth(wo.completedAt).getTime() === monthStart.getTime())
      .reduce((sum, wo) => sum + Number(wo.totalCostSar ?? 0), 0);
    return { label: format(monthStart, "MMM"), cost: Math.round(monthCost) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Executive Command Center</h1>
        <p className="text-sm text-slate-500">Business-level view across your maintenance operation.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Portfolio Health" value={`${health.overallScore}/100`} sub={band.label} />
        <StatCard label="Open Critical Risks" value={openCritical.length} tone={openCritical.length > 0 ? "red" : "green"} />
        <StatCard label="Cost (Month to Date)" value={`SAR ${(monthCost._sum.totalCostSar ?? 0).toLocaleString()}`} />
        <StatCard label="Avg Technician Score" value={avgTechScore != null ? `${avgTechScore}/100` : "No data"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Maintenance cost, last 6 months</h2>
          </CardHeader>
          <CardBody>
            <TrendAreaChart data={costTrend} dataKey="cost" color="#059669" valueFormat="sar" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Portfolio health breakdown</h2>
          </CardHeader>
          <CardBody>
            <HealthBreakdownChart data={healthChartData} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Critical risks</h2>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {openCritical.slice(0, 6).map((wo) => (
              <Link key={wo.id} href={`/app/work-orders/${wo.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm text-slate-800">{wo.description}</p>
                  <p className="text-xs text-slate-500">{wo.site.name}{wo.asset ? ` · ${wo.asset.assetCode}` : ""}</p>
                </div>
                <Badge tone="red">{wo.priority}</Badge>
              </Link>
            ))}
            {openCritical.length === 0 && <p className="p-5 text-sm text-slate-500">No open critical risks.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Replacement forecast (next 12 months)</h2>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {upcomingReplacements.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-slate-800">{a.name}</p>
                  <p className="font-mono text-xs text-slate-500">{a.assetCode}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {a.eolDate.toLocaleDateString()}
                  {a.replacementCostSar ? ` · SAR ${Number(a.replacementCostSar).toLocaleString()}` : ""}
                </p>
              </div>
            ))}
            {upcomingReplacements.length === 0 && (
              <p className="p-5 text-sm text-slate-500">No assets nearing end of useful life.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Vendor network</h2>
        </CardHeader>
        <CardBody>
          {vendorCount > 0 ? (
            <p className="text-sm text-slate-600">{vendorCount} vendors registered on the platform.</p>
          ) : (
            <p className="text-sm text-slate-500">
              No vendors approved yet. The managed maintenance / RFQ workflow (Phase 2–3) will surface contractor
              performance and cost benchmarking here once vendor onboarding is active.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
