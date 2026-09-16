import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canViewFinancials } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateCurrentWeeklyReport, generateCurrentMonthlyReport } from "@/server/reports";
import { format } from "date-fns";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await requireOrgSession();
  const reports = await prisma.weeklyReport.findMany({
    where: { orgId: session.orgId },
    orderBy: { weekStart: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Executive Reports</h1>
          <p className="text-sm text-slate-500">Auto-generated from live operational data.</p>
        </div>
        {canViewFinancials(session.role) && (
          <div className="flex gap-2">
            <form action={generateCurrentWeeklyReport}>
              <Button type="submit" variant="secondary">
                Generate weekly report
              </Button>
            </form>
            <form action={generateCurrentMonthlyReport}>
              <Button type="submit">Generate monthly report</Button>
            </form>
          </div>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {reports.map((r) => (
            <Link key={r.id} href={`/app/reports/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <Badge tone={r.period === "MONTHLY" ? "purple" : "blue"}>{r.period}</Badge>
                <p className="text-sm text-slate-800">
                  {r.period === "MONTHLY" ? format(r.weekStart, "MMMM yyyy") : (
                    <>Week of {format(r.weekStart, "dd MMM yyyy")} – {format(r.weekEnd, "dd MMM yyyy")}</>
                  )}
                </p>
              </div>
              <p className="text-xs text-slate-400">Generated {format(r.generatedAt, "dd MMM, HH:mm")}</p>
            </Link>
          ))}
          {reports.length === 0 && <p className="p-5 text-sm text-slate-500">No reports generated yet.</p>}
        </div>
      </Card>
    </div>
  );
}
