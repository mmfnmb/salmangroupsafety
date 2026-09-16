import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { computePortfolioHealth, healthBand } from "@/lib/scoring";
import { evaluateSlaStage, DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { canViewFinancials } from "@/lib/roles";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthBreakdownChart } from "@/components/charts/health-breakdown-chart";
import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import Link from "next/link";
import { format, subDays, startOfDay } from "date-fns";

export default async function OpsDashboardPage() {
  const session = await requireOrgSession();

  const [health, openWorkOrders, newRequests, duePM, technicianCount] = await Promise.all([
    computePortfolioHealth(session.orgId),
    prisma.workOrder.findMany({
      where: { orgId: session.orgId, status: { notIn: ["CLOSED", "CANCELLED"] } },
      include: { site: true, asset: true, slaPolicy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { orgId: session.orgId, status: "NEW" },
      include: { site: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.pMSchedule.count({
      where: { pmPlan: { orgId: session.orgId }, status: { in: ["DUE", "OVERDUE"] } },
    }),
    prisma.technician.count({ where: { orgId: session.orgId, status: "ACTIVE" } }),
  ]);

  const parts = await prisma.part.findMany({
    where: { orgId: session.orgId },
    select: { stockQuantity: true, minStockQuantity: true },
  });
  const lowStockParts = parts.filter((p) => p.stockQuantity <= p.minStockQuantity).length;

  const trendStart = startOfDay(subDays(new Date(), 13));
  const recentRequests = await prisma.maintenanceRequest.findMany({
    where: { orgId: session.orgId, createdAt: { gte: trendStart } },
    select: { createdAt: true },
  });
  const requestTrend = Array.from({ length: 14 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 13 - i));
    const count = recentRequests.filter((r) => startOfDay(r.createdAt).getTime() === day.getTime()).length;
    return { label: format(day, "d MMM"), requests: count };
  });

  const STATUS_LABELS: Record<string, string> = {
    NEW: "New", ASSIGNED: "Assigned", ACCEPTED: "Accepted", EN_ROUTE: "En route", ON_SITE: "On site",
    DIAGNOSIS: "Diagnosis", WAITING_APPROVAL: "Waiting approval", WAITING_PARTS: "Waiting parts",
    IN_PROGRESS: "In progress", TESTING: "Testing", COMPLETED: "Completed", CUSTOMER_VERIFICATION: "Verification",
    REOPENED: "Reopened",
  };
  const statusCounts = new Map<string, number>();
  for (const wo of openWorkOrders) statusCounts.set(wo.status, (statusCounts.get(wo.status) ?? 0) + 1);
  const statusChartData = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ label: STATUS_LABELS[status] ?? status, count }))
    .sort((a, b) => b.count - a.count);

  const healthChartData = [
    { label: "Condition", score: health.conditionScore },
    { label: "PM Compliance", score: health.pmComplianceScore },
    { label: "Reliability", score: health.breakdownScore },
    { label: "Open Defects", score: health.openDefectScore },
  ];

  const emergencies = openWorkOrders.filter((wo) => wo.priority === "EMERGENCY" || wo.priority === "CRITICAL");
  const slaBreached = openWorkOrders.filter((wo) => {
    const allotted = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
    return evaluateSlaStage({ createdAt: wo.createdAt, actualAt: null, allottedMinutes: allotted }) === "breached";
  });
  const awaitingApproval = openWorkOrders.filter((wo) => wo.status === "WAITING_APPROVAL");

  const band = healthBand(health.overallScore);
  const showFinancials = canViewFinancials(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Operations Dashboard</h1>
        <p className="text-sm text-slate-500">Live snapshot across your portfolio.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Portfolio Health" value={`${health.overallScore}/100`} sub={band.label} />
        <StatCard label="Open Work Orders" value={openWorkOrders.length} />
        <StatCard label="Emergency / Critical" value={emergencies.length} tone={emergencies.length > 0 ? "red" : "green"} />
        <StatCard label="SLA Breached" value={slaBreached.length} tone={slaBreached.length > 0 ? "red" : "green"} />
        <StatCard label="New Requests" value={newRequests.length} tone={newRequests.length > 0 ? "amber" : "green"} />
        <StatCard label="PM Due / Overdue" value={duePM} tone={duePM > 0 ? "amber" : "green"} />
        <StatCard label="Active Technicians" value={technicianCount} />
        <StatCard label="Awaiting Approval" value={awaitingApproval.length} />
        <StatCard label="Low Stock Parts" value={lowStockParts} tone={lowStockParts > 0 ? "amber" : "green"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Requests, last 14 days</h2>
          </CardHeader>
          <CardBody>
            <TrendAreaChart data={requestTrend} dataKey="requests" />
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

      {statusChartData.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Open work orders by status</h2>
          </CardHeader>
          <CardBody>
            <StatusBarChart data={statusChartData} />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">New requests to triage</h2>
            <Link href="/app/requests" className="text-xs text-blue-700">View all</Link>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {newRequests.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <p className="text-sm text-slate-800">{r.description}</p>
                <p className="text-xs text-slate-500">{r.site.name} · {r.referenceNumber}</p>
              </div>
            ))}
            {newRequests.length === 0 && <p className="p-5 text-sm text-slate-500">Nothing waiting — good.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Emergency & critical work orders</h2>
            <Link href="/app/work-orders" className="text-xs text-blue-700">View all</Link>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {emergencies.slice(0, 5).map((wo) => (
              <Link key={wo.id} href={`/app/work-orders/${wo.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm text-slate-800">{wo.description}</p>
                  <p className="text-xs text-slate-500">{wo.site.name}{wo.asset ? ` · ${wo.asset.assetCode}` : ""}</p>
                </div>
                <Badge tone="red">{wo.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))}
            {emergencies.length === 0 && <p className="p-5 text-sm text-slate-500">No open emergencies.</p>}
          </div>
        </Card>
      </div>

      {showFinancials && (
        <Card>
          <CardBody className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Generate this week&apos;s executive report for stakeholders.</p>
            <Link href="/app/reports" className="text-sm font-medium text-blue-700">
              Go to Reports →
            </Link>
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-slate-400">As of {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
    </div>
  );
}
