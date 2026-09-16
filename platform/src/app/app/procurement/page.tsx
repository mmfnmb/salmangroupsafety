import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";

const REQUEST_STATUS_TONE = {
  FULFILLED_FROM_STOCK: "green",
  PENDING_APPROVAL: "amber",
  APPROVED: "blue",
  REJECTED: "red",
  SUPPLIED: "green",
  CANCELLED: "slate",
} as const;

const ORDER_STATUS_TONE = {
  DRAFT: "slate",
  ORDERED: "amber",
  SUPPLIED: "green",
  CANCELLED: "slate",
} as const;

export default async function ProcurementPage() {
  const session = await requireOrgSession();

  const [requests, orders] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: { orgId: session.orgId },
      include: { site: true, requestedByUser: true, purchaseOrder: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.purchaseOrder.findMany({
      where: { orgId: session.orgId },
      include: { purchaseRequest: true, supplierVendor: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Procurement</h1>
          <p className="text-sm text-slate-500">Material &amp; works requests — fully documented, from request to delivery.</p>
        </div>
        <LinkButton href="/app/procurement/new">+ New purchase request</LinkButton>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Requests</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Request #</th>
              <th className="px-4 py-2 text-start">Item</th>
              <th className="px-4 py-2 text-start">Site</th>
              <th className="px-4 py-2 text-start">Requested by</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/app/procurement/${r.id}`} className="font-mono text-xs text-blue-700">{r.requestNumber}</Link>
                </td>
                <td className="px-4 py-2.5 text-slate-800">{r.itemName} × {r.quantity}{r.unit ? ` ${r.unit}` : ""}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.site.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.requestedByUser.name}</td>
                <td className="px-4 py-2.5"><Badge tone={REQUEST_STATUS_TONE[r.status]}>{r.status.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{format(r.createdAt, "dd MMM yyyy")}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No purchase requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Purchase orders (archive)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Order #</th>
              <th className="px-4 py-2 text-start">Item</th>
              <th className="px-4 py-2 text-start">Supplier</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">Ordered</th>
              <th className="px-4 py-2 text-start">Supplied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/app/procurement/orders/${o.id}`} className="font-mono text-xs text-blue-700">{o.orderNumber}</Link>
                </td>
                <td className="px-4 py-2.5 text-slate-800">{o.purchaseRequest.itemName}</td>
                <td className="px-4 py-2.5 text-slate-600">{o.supplierVendor?.name ?? o.supplierNameFreeText ?? "—"}</td>
                <td className="px-4 py-2.5"><Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{o.orderedAt ? format(o.orderedAt, "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{o.suppliedAt ? format(o.suppliedAt, "dd MMM yyyy") : "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No purchase orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
