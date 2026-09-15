import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import Link from "next/link";

const STATUS_TONE = {
  OPERATIONAL: "green",
  DOWN: "red",
  UNDER_MAINTENANCE: "amber",
  DECOMMISSIONED: "slate",
} as const;

const CRITICALITY_TONE = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "amber",
  CRITICAL: "red",
} as const;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; q?: string; status?: string }>;
}) {
  const session = await requireOrgSession();
  const params = await searchParams;

  const [assets, sites] = await Promise.all([
    prisma.asset.findMany({
      where: {
        orgId: session.orgId,
        siteId: params.siteId || undefined,
        status: (params.status as never) || undefined,
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: "insensitive" } },
                { assetCode: { contains: params.q, mode: "insensitive" } },
                { serialNumber: { contains: params.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { site: true, systemType: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.site.findMany({ where: { orgId: session.orgId }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500">{assets.length} assets in view</p>
        </div>
        <LinkButton href="/app/assets/new">+ Register asset</LinkButton>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search code, name, serial…"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="siteId" defaultValue={params.siteId} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="DOWN">Down</option>
          <option value="UNDER_MAINTENANCE">Under maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
        <button className="rounded-md bg-slate-800 px-3.5 py-2 text-sm font-medium text-white">Filter</button>
      </form>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Asset Code</th>
              <th className="px-4 py-2 text-start">Name</th>
              <th className="px-4 py-2 text-start">Site</th>
              <th className="px-4 py-2 text-start">System</th>
              <th className="px-4 py-2 text-start">Criticality</th>
              <th className="px-4 py-2 text-start">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/app/assets/${a.id}`} className="font-mono text-xs text-blue-700">
                    {a.assetCode}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-800">{a.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.site.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.systemType?.nameEn ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={CRITICALITY_TONE[a.criticality]}>{a.criticality}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
