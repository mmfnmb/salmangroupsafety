import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { computeVendorPerformance } from "@/lib/scoring";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleVendorBlacklist } from "@/server/vendors";
import { subDays } from "date-fns";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const session = await requireOrgSession();
  const params = await searchParams;

  const [vendors, blacklistEntries] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        status: "APPROVED",
        coverageCities: params.city ? { has: params.city } : undefined,
        categories: params.category ? { has: params.category } : undefined,
      },
      orderBy: { name: "asc" },
    }),
    prisma.vendorBlacklistEntry.findMany({ where: { orgId: session.orgId } }),
  ]);
  const blacklistedIds = new Set(blacklistEntries.map((b) => b.vendorId));

  const withScores = await Promise.all(
    vendors.map(async (v) => ({
      vendor: v,
      score: await computeVendorPerformance(v.id, subDays(new Date(), 90), new Date()),
    }))
  );

  const canManage = canManageOrg(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendor Directory</h1>
        <p className="text-sm text-slate-500">
          Approved maintenance contractors on the platform. RFQ, quote comparison and award (Phase 3) will let you
          invite vendors to quote directly from a work order.
        </p>
      </div>

      <form className="flex gap-3" method="get">
        <input name="city" defaultValue={params.city} placeholder="Filter by city" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input name="category" defaultValue={params.category} placeholder="Filter by category" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-md bg-slate-800 px-3.5 py-2 text-sm font-medium text-white">Filter</button>
      </form>

      {vendors.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">No approved vendors match this filter yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withScores.map(({ vendor: v, score }) => {
            const isBlacklisted = blacklistedIds.has(v.id);
            const toggleAction = toggleVendorBlacklist.bind(null, v.id);
            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-900">{v.name}</p>
                  {score.overallScore != null && (
                    <Badge tone={score.overallScore >= 80 ? "green" : score.overallScore >= 60 ? "amber" : "red"}>
                      {score.overallScore}/100
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.categories.slice(0, 4).map((c) => (
                    <Badge key={c} tone="blue">{c}</Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">{v.coverageCities.join(", ") || "No coverage listed"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {score.jobsCompleted > 0 ? `${score.jobsCompleted} jobs completed` : "No job history yet"}
                </p>
                {canManage && (
                  <form action={toggleAction} className="mt-3">
                    <Button type="submit" variant={isBlacklisted ? "secondary" : "ghost"} className="w-full px-2 py-1 text-xs">
                      {isBlacklisted ? "Remove from blacklist" : "Blacklist for our organization"}
                    </Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
