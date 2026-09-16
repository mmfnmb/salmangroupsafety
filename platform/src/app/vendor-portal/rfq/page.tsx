import { requireVendorSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function VendorRfqListPage() {
  const session = await requireVendorSession();

  const invites = await prisma.rfqVendor.findMany({
    where: { vendorId: session.vendorId },
    include: {
      rfq: {
        include: { site: true, organization: true, quotations: { where: { vendorId: session.vendorId } } },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">RFQ Invitations</h1>
      <Card>
        <div className="divide-y divide-slate-100">
          {invites.map((inv) => {
            const myQuote = inv.rfq.quotations[0];
            return (
              <Link
                key={inv.id}
                href={`/vendor-portal/rfq/${inv.rfq.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-mono text-xs text-slate-500">{inv.rfq.number} · {inv.rfq.organization.name}</p>
                  <p className="text-sm text-slate-800">{inv.rfq.title}</p>
                  <p className="text-xs text-slate-500">{inv.rfq.site.name} · invited {format(inv.invitedAt, "dd MMM yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {myQuote && <Badge tone={myQuote.status === "AWARDED" ? "green" : "slate"}>{myQuote.status}</Badge>}
                  <Badge tone={STATUS_TONE[inv.rfq.status]}>{inv.rfq.status}</Badge>
                </div>
              </Link>
            );
          })}
          {invites.length === 0 && <p className="p-5 text-sm text-slate-500">No RFQ invitations yet.</p>}
        </div>
      </Card>
    </div>
  );
}
