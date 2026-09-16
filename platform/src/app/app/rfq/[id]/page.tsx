import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { canManageOrg, canViewFinancials } from "@/lib/roles";
import { inviteVendors, evaluateQuotation, awardQuotation } from "@/server/rfq";
import { computeCommercialScores, computeBestValueScore, TECHNICAL_QUALIFYING_THRESHOLD } from "@/lib/rfq-evaluation";
import { vendorTrackRecordScore } from "@/lib/scoring";
import { computePlatformFee } from "@/lib/platform-fee";
import { format } from "date-fns";
import Link from "next/link";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const rfq = await prisma.rfq.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      site: true,
      asset: true,
      vendors: { include: { vendor: true } },
      quotations: { include: { vendor: true } },
      awardedQuotation: { include: { vendor: true } },
    },
  });
  if (!rfq) notFound();

  const canManage = canManageOrg(session.role);
  const showFinancials = canViewFinancials(session.role);

  const invitedVendorIds = new Set(rfq.vendors.map((v) => v.vendorId));
  const blacklisted = await prisma.vendorBlacklistEntry.findMany({ where: { orgId: session.orgId } });
  const blacklistedIds = new Set(blacklisted.map((b) => b.vendorId));
  const candidateVendors = await prisma.vendor.findMany({
    where: { status: "APPROVED", id: { notIn: [...blacklistedIds] } },
    orderBy: { name: "asc" },
  });
  const uninvited = candidateVendors.filter((v) => !invitedVendorIds.has(v.id));

  const commercialScores = computeCommercialScores(
    rfq.quotations.map((q) => ({ id: q.id, vendorId: q.vendorId, totalCostSar: q.totalCostSar ? Number(q.totalCostSar) : null, technicalScore: q.technicalScore }))
  );
  const trackRecords = Object.fromEntries(
    await Promise.all(rfq.quotations.map(async (q) => [q.vendorId, await vendorTrackRecordScore(q.vendorId)] as const))
  );
  const bestValueScores = Object.fromEntries(
    rfq.quotations.map((q) => [
      q.id,
      computeBestValueScore(q.technicalScore, commercialScores[q.id], trackRecords[q.vendorId]),
    ])
  );
  const recommendedId = Object.entries(bestValueScores)
    .filter(([, v]) => v != null)
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

  const inviteAction = inviteVendors.bind(null, rfq.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{rfq.number}</p>
          <h1 className="text-xl font-semibold text-slate-900">{rfq.title}</h1>
          <p className="text-sm text-slate-500">{rfq.site.name}{rfq.asset ? ` · ${rfq.asset.assetCode}` : ""}</p>
        </div>
        <Badge tone={rfq.status === "AWARDED" ? "green" : "blue"}>{rfq.status}</Badge>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-900">Scope of work</h2></CardHeader>
        <CardBody><p className="whitespace-pre-wrap text-sm text-slate-700">{rfq.scopeOfWork}</p></CardBody>
      </Card>

      {rfq.status === "AWARDED" && rfq.awardedQuotation ? (
        <Card className="border-green-300">
          <CardHeader><h2 className="text-sm font-semibold text-slate-900">Awarded</h2></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p><strong>{rfq.awardedQuotation.vendor.name}</strong> was awarded this contract on {rfq.awardedAt && format(rfq.awardedAt, "dd MMM yyyy")}.</p>
            {showFinancials && (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-4">
                <FeeStat label="Contractor price" value={`SAR ${Number(rfq.awardedQuotation.totalCostSar ?? 0).toLocaleString()}`} />
                <FeeStat
                  label="Platform fee"
                  value={
                    rfq.platformFeePercent != null
                      ? `SAR ${Number(rfq.platformFeeSar).toLocaleString()} (${Number(rfq.platformFeePercent)}%)`
                      : "Negotiated"
                  }
                />
                <FeeStat label="VAT (indicative)" value="+15% — invoiced separately" />
                <FeeStat
                  label="Total customer cost"
                  value={`SAR ${(Number(rfq.awardedQuotation.totalCostSar ?? 0) + Number(rfq.platformFeeSar ?? 0)).toLocaleString()}`}
                />
              </div>
            )}
            <p className="text-xs text-slate-500">
              The vendor invoices you directly for execution; the platform fee is billed separately — never hidden inside the contractor&apos;s price.
            </p>
          </CardBody>
        </Card>
      ) : (
        canManage && (
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-slate-900">Invite vendors to quote</h2></CardHeader>
            <CardBody>
              {uninvited.length === 0 ? (
                <p className="text-sm text-slate-500">No further approved vendors available to invite.</p>
              ) : (
                <form action={inviteAction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {uninvited.map((v) => (
                      <label key={v.id} className="flex items-start gap-2 rounded-md border border-slate-200 p-2.5">
                        <input type="checkbox" name="vendorIds" value={v.id} className="mt-0.5" />
                        <span>
                          <span className="block font-medium text-slate-800">{v.name}</span>
                          <span className="block text-xs text-slate-500">{v.categories.slice(0, 3).join(", ")}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button type="submit" variant="secondary">Send invitations</Button>
                </form>
              )}
            </CardBody>
          </Card>
        )
      )}

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-900">Invited vendors ({rfq.vendors.length})</h2></CardHeader>
        <div className="divide-y divide-slate-100">
          {rfq.vendors.map((rv) => {
            const quoted = rfq.quotations.some((q) => q.vendorId === rv.vendorId);
            return (
              <div key={rv.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span>{rv.vendor.name}</span>
                <Badge tone={quoted ? "green" : "amber"}>{quoted ? "Quoted" : "Awaiting quote"}</Badge>
              </div>
            );
          })}
          {rfq.vendors.length === 0 && <p className="p-5 text-sm text-slate-500">No vendors invited yet.</p>}
        </div>
      </Card>

      {rfq.quotations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Quotation comparison</h2>
            <p className="mt-1 text-xs text-slate-500">
              A technical score below {TECHNICAL_QUALIFYING_THRESHOLD}/100 disqualifies a quote commercially — the
              cheapest price never wins by default.
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-start">Vendor</th>
                  {showFinancials && <th className="px-4 py-2 text-start">Total (SAR)</th>}
                  <th className="px-4 py-2 text-start">Lead time</th>
                  <th className="px-4 py-2 text-start">Warranty</th>
                  <th className="px-4 py-2 text-start">Technical</th>
                  <th className="px-4 py-2 text-start">Commercial</th>
                  <th className="px-4 py-2 text-start">Track record</th>
                  <th className="px-4 py-2 text-start">Best value</th>
                  <th className="px-4 py-2 text-start">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfq.quotations.map((q) => {
                  const evalAction = evaluateQuotation.bind(null, q.id);
                  const awardAction = awardQuotation.bind(null, rfq.id, q.id);
                  const qualifies = q.technicalScore != null && q.technicalScore >= TECHNICAL_QUALIFYING_THRESHOLD;
                  const isRecommended = q.id === recommendedId;
                  return (
                    <tr key={q.id} className={isRecommended ? "bg-emerald-50/60" : ""}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{q.vendor.name}</span>
                        {isRecommended && <Badge tone="green" className="ms-2">Recommended</Badge>}
                      </td>
                      {showFinancials && (
                        <td className="px-4 py-3 text-slate-700">{q.totalCostSar ? Number(q.totalCostSar).toLocaleString() : "—"}</td>
                      )}
                      <td className="px-4 py-3 text-slate-600">{q.leadTimeDays ? `${q.leadTimeDays}d` : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{q.warrantyMonths ? `${q.warrantyMonths}mo` : "—"}</td>
                      <td className="px-4 py-3">
                        {canManage && rfq.status !== "AWARDED" ? (
                          <form action={evalAction} className="flex items-center gap-1">
                            <Input
                              name="technicalScore"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={q.technicalScore ?? ""}
                              className="w-16 px-2 py-1"
                            />
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Set</Button>
                          </form>
                        ) : (
                          q.technicalScore ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{commercialScores[q.id] ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{trackRecords[q.vendorId] ?? "no data"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{bestValueScores[q.id] ?? "—"}</td>
                      <td className="px-4 py-3">
                        {rfq.status === "AWARDED" ? (
                          q.status === "AWARDED" ? <Badge tone="green">Awarded</Badge> : <Badge tone="slate">Not selected</Badge>
                        ) : canManage && qualifies ? (
                          <form action={awardAction}>
                            <Button type="submit" className="px-2.5 py-1 text-xs">Award</Button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">{qualifies ? "—" : "Not qualified"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FeeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}
