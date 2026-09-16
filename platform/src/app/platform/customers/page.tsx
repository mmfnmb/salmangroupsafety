import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_TONE = { TRIAL: "amber", ACTIVE: "green", PAST_DUE: "red", SUSPENDED: "red", CANCELLED: "slate" } as const;

export default async function PlatformCustomersPage() {
  const orgs = await prisma.organization.findMany({
    include: { plan: true, _count: { select: { sites: true, assets: true, users: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Organization</th>
              <th className="px-4 py-2 text-start">Plan</th>
              <th className="px-4 py-2 text-start">Sites</th>
              <th className="px-4 py-2 text-start">Assets</th>
              <th className="px-4 py-2 text-start">Users</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2.5 text-slate-800">{o.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{o.plan?.nameEn ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{o._count.sites}</td>
                <td className="px-4 py-2.5 text-slate-600">{o._count.assets}</td>
                <td className="px-4 py-2.5 text-slate-600">{o._count.users}</td>
                <td className="px-4 py-2.5"><Badge tone={STATUS_TONE[o.subscriptionStatus]}>{o.subscriptionStatus}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{format(o.createdAt, "dd MMM yyyy")}</td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
