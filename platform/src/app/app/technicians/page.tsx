import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { computeTechnicianPerformance } from "@/lib/scoring";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTechnician } from "@/server/technicians";
import { subDays } from "date-fns";
import Link from "next/link";

export default async function TechniciansPage() {
  const session = await requireOrgSession();
  const [technicians, sites] = await Promise.all([
    prisma.technician.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
    prisma.site.findMany({ where: { orgId: session.orgId }, select: { id: true, name: true } }),
  ]);

  const periodStart = subDays(new Date(), 90);
  const periodEnd = new Date();

  const withScores = await Promise.all(
    technicians.map(async (t) => ({
      technician: t,
      score: await computeTechnicianPerformance(t.id, periodStart, periodEnd),
    }))
  );
  withScores.sort((a, b) => b.score.overallScore - a.score.overallScore);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Technicians</h1>
        <p className="text-sm text-slate-500">Performance score computed over the last 90 days.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {withScores.map(({ technician, score }, i) => (
            <Link key={technician.id} href={`/app/technicians/${technician.id}`} className="block">
              <Card className="flex items-center justify-between px-5 py-4 hover:border-blue-300">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-semibold text-slate-400">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{technician.name}</p>
                    <p className="text-xs text-slate-500">
                      {technician.trade} · {score.jobsCompleted} jobs completed
                    </p>
                  </div>
                </div>
                <ScoreBadge value={Math.round(score.overallScore)} />
              </Card>
            </Link>
          ))}
          {withScores.length === 0 && (
            <p className="text-sm text-slate-500">No technicians yet — add your first one.</p>
          )}
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Add technician</h2>
            </CardHeader>
            <CardBody>
              <form action={createTechnician} className="space-y-4">
                <Field label="Name (English)" htmlFor="name" required>
                  <Input id="name" name="name" required />
                </Field>
                <Field label="Name (Arabic)" htmlFor="nameAr">
                  <Input id="nameAr" name="nameAr" dir="rtl" />
                </Field>
                <Field label="Trade" htmlFor="trade" required>
                  <Input id="trade" name="trade" placeholder="HVAC Technician" required />
                </Field>
                <Field label="Employee ID" htmlFor="employeeId">
                  <Input id="employeeId" name="employeeId" />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" />
                </Field>
                <Field label="Site" htmlFor="siteId">
                  <Select id="siteId" name="siteId" defaultValue="">
                    <option value="">Unassigned</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" className="w-full">
                  Add technician
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const tone = value >= 80 ? "green" : value >= 60 ? "amber" : "red";
  return (
    <Badge tone={tone} className="text-sm">
      {value}/100
    </Badge>
  );
}
