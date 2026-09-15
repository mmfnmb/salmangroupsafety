import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { computeTechnicianPerformance, DEFAULT_TECHNICIAN_WEIGHTS } from "@/lib/scoring";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subDays, format } from "date-fns";
import Link from "next/link";

const LABELS: Record<keyof typeof DEFAULT_TECHNICIAN_WEIGHTS, string> = {
  responseTime: "Response time",
  slaCompliance: "SLA compliance",
  ftfr: "First-time fix rate",
  repeatFailure: "Repeat-failure avoidance",
  pmCompletion: "PM completion",
  quality: "Repair quality",
  documentation: "Documentation quality",
  safety: "Safety compliance",
  satisfaction: "Customer satisfaction",
};

export default async function TechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const technician = await prisma.technician.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      certifications: true,
      workOrders: { orderBy: { createdAt: "desc" }, take: 20, include: { asset: true, site: true } },
    },
  });
  if (!technician) notFound();

  const periodStart = subDays(new Date(), 90);
  const score = await computeTechnicianPerformance(technician.id, periodStart, new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{technician.name}</h1>
        <p className="text-sm text-slate-500">
          {technician.trade}
          {technician.employeeId ? ` · ID ${technician.employeeId}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Recent work orders</h2>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {technician.workOrders.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/app/work-orders/${wo.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-mono text-xs text-slate-500">{wo.number}</p>
                    <p className="text-sm text-slate-800">{wo.description}</p>
                  </div>
                  <Badge tone="slate">{wo.status.replace(/_/g, " ")}</Badge>
                </Link>
              ))}
              {technician.workOrders.length === 0 && (
                <p className="p-5 text-sm text-slate-500">No work orders yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Certifications</h2>
            </CardHeader>
            <CardBody>
              {technician.certifications.length === 0 ? (
                <p className="text-sm text-slate-500">None recorded.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {technician.certifications.map((c) => (
                    <li key={c.id}>
                      {c.name} {c.expiryDate ? `— expires ${format(c.expiryDate, "dd MMM yyyy")}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Performance score (last 90 days)</h2>
          </CardHeader>
          <CardBody>
            <p className="text-4xl font-bold text-blue-700">{Math.round(score.overallScore)}</p>
            <p className="text-xs text-slate-500">{score.jobsCompleted} jobs completed</p>
            <dl className="mt-4 space-y-2 text-xs">
              <ScoreRow label={LABELS.responseTime} weight={DEFAULT_TECHNICIAN_WEIGHTS.responseTime} value={score.responseTimeScore} />
              <ScoreRow label={LABELS.slaCompliance} weight={DEFAULT_TECHNICIAN_WEIGHTS.slaCompliance} value={score.slaComplianceScore} />
              <ScoreRow label={LABELS.ftfr} weight={DEFAULT_TECHNICIAN_WEIGHTS.ftfr} value={score.ftfrScore} />
              <ScoreRow label={LABELS.repeatFailure} weight={DEFAULT_TECHNICIAN_WEIGHTS.repeatFailure} value={score.repeatFailureScore} />
              <ScoreRow label={LABELS.pmCompletion} weight={DEFAULT_TECHNICIAN_WEIGHTS.pmCompletion} value={score.pmCompletionScore} />
              <ScoreRow label={LABELS.quality} weight={DEFAULT_TECHNICIAN_WEIGHTS.quality} value={score.qualityScore} />
              <ScoreRow label={LABELS.documentation} weight={DEFAULT_TECHNICIAN_WEIGHTS.documentation} value={score.documentationScore} />
              <ScoreRow label={LABELS.safety} weight={DEFAULT_TECHNICIAN_WEIGHTS.safety} value={score.safetyComplianceScore} />
              <ScoreRow label={LABELS.satisfaction} weight={DEFAULT_TECHNICIAN_WEIGHTS.satisfaction} value={score.satisfactionScore} />
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ScoreRow({ label, weight, value }: { label: string; weight: number; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-slate-600">
        <span>
          {label} <span className="text-slate-400">({Math.round(weight * 100)}%)</span>
        </span>
        <span className="font-medium text-slate-900">{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
