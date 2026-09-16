import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_TONE = {
  DRAFT: "slate",
  RELEASED: "blue",
  QUOTING: "amber",
  EVALUATING: "purple",
  AWARDED: "green",
  CANCELLED: "slate",
} as const;

export default async function RfqListPage() {
  const session = await requireOrgSession();
  const rfqs = await prisma.rfq.findMany({
    where: { orgId: session.orgId },
    include: { site: true, vendors: true, quotations: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Requests for Quotation</h1>
          <p className="text-sm text-slate-500">Managed procurement — invite vendors, compare quotes, award with a full audit trail.</p>
        </div>
        <LinkButton href="/app/rfq/new">+ New RFQ</LinkButton>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">RFQ #</th>
              <th className="px-4 py-2 text-start">Title</th>
              <th className="px-4 py-2 text-start">Site</th>
              <th className="px-4 py-2 text-start">Invited</th>
              <th className="px-4 py-2 text-start">Quotes</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rfqs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/app/rfq/${r.id}`} className="font-mono text-xs text-blue-700">{r.number}</Link>
                </td>
                <td className="px-4 py-2.5 text-slate-800">{r.title}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.site.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.vendors.length}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.quotations.length}</td>
                <td className="px-4 py-2.5"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{format(r.createdAt, "dd MMM yyyy")}</td>
              </tr>
            ))}
            {rfqs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No RFQs yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
