import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { canViewFinancials } from "@/lib/roles";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WeeklyReportData } from "@/lib/weekly-report";
import { PrintButton } from "@/components/print-button";
import { format } from "date-fns";

export default async function WeeklyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();
  const report = await prisma.weeklyReport.findFirst({ where: { id, orgId: session.orgId } });
  if (!report) notFound();

  const data = report.data as unknown as WeeklyReportData;
  const showFinancials = canViewFinancials(session.role);

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Executive Weekly Report</h1>
          <p className="text-sm text-slate-500">
            {format(new Date(data.period.start), "dd MMM yyyy")} – {format(new Date(data.period.end), "dd MMM yyyy")}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Portfolio Health" value={`${data.portfolio.overallScore}/100`} />
        <StatCard label="PM Compliance" value={`${data.portfolio.pmComplianceScore}%`} />
        <StatCard
          label="SLA Achievement"
          value={data.sla.achievementPercent != null ? `${data.sla.achievementPercent}%` : "—"}
        />
        <StatCard label="Open Work Orders" value={data.workOrders.openTotal} tone={data.workOrders.overdue > 0 ? "red" : "green"} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Work Orders</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-3 gap-4 text-sm sm:grid-cols-6">
          <Metric label="Opened" value={data.workOrders.opened} />
          <Metric label="Closed" value={data.workOrders.closed} />
          <Metric label="Overdue (SLA)" value={data.workOrders.overdue} warn={data.workOrders.overdue > 0} />
          <Metric label="Emergency open" value={data.workOrders.emergencyOpen} warn={data.workOrders.emergencyOpen > 0} />
          <Metric label="Preventive" value={data.workOrders.preventive} />
          <Metric label="Corrective" value={data.workOrders.corrective} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">SLA Performance</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-3 gap-4 text-sm">
          <Metric label="SLA achievement" value={data.sla.achievementPercent != null ? `${data.sla.achievementPercent}%` : "No data"} />
          <Metric label="Avg response time" value={data.sla.avgResponseMinutes != null ? `${data.sla.avgResponseMinutes} min` : "No data"} />
          <Metric label="Avg resolution time" value={data.sla.avgResolutionMinutes != null ? `${data.sla.avgResolutionMinutes} min` : "No data"} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Technician Performance</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Best performing</p>
            {data.technicians.best.map((t) => (
              <p key={t.id} className="text-slate-700">{t.name} — {Math.round(t.score)}</p>
            ))}
            {data.technicians.best.length === 0 && <p className="text-slate-400">No data</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Needs attention</p>
            {data.technicians.needsAttention.map((t) => (
              <p key={t.id} className="text-amber-700">{t.name} — {Math.round(t.score)}</p>
            ))}
            {data.technicians.needsAttention.length === 0 && <p className="text-slate-400">None flagged</p>}
          </div>
        </CardBody>
      </Card>

      {showFinancials && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Financial</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-3 gap-4 text-sm">
            <Metric label="This week" value={`SAR ${data.finance.weeklyCostSar.toLocaleString()}`} />
            <Metric label="Month to date" value={`SAR ${data.finance.mtdCostSar.toLocaleString()}`} />
            <Metric label="Year to date" value={`SAR ${data.finance.ytdCostSar.toLocaleString()}`} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Critical Issues</h2>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {data.criticalIssues.map((c) => (
            <div key={c.number} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-mono text-xs text-slate-500">{c.number}</p>
                <p className="text-slate-800">{c.description}</p>
                <p className="text-xs text-slate-500">{c.site}{c.asset ? ` · ${c.asset}` : ""}</p>
              </div>
              <Badge tone="red">{c.status.replace(/_/g, " ")}</Badge>
            </div>
          ))}
          {data.criticalIssues.length === 0 && <p className="p-5 text-sm text-slate-500">No open critical/emergency issues.</p>}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${warn ? "text-amber-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
