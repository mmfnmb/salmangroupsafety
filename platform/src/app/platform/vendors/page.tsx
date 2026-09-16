import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setVendorStatus } from "@/server/vendors";
import { format } from "date-fns";

const STATUS_TONE = {
  PENDING: "amber",
  UNDER_REVIEW: "blue",
  APPROVED: "green",
  SUSPENDED: "red",
  REJECTED: "slate",
} as const;

export default async function PlatformVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    include: { documents: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Vendor Applications</h1>

      <div className="space-y-4">
        {vendors.map((v) => {
          const approve = setVendorStatus.bind(null, v.id, "APPROVED");
          const reject = setVendorStatus.bind(null, v.id, "REJECTED");
          const suspend = setVendorStatus.bind(null, v.id, "SUSPENDED");
          const underReview = setVendorStatus.bind(null, v.id, "UNDER_REVIEW");

          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.email} · {v.phone}</p>
                  <p className="text-xs text-slate-500">CR: {v.crNumber ?? "—"} · VAT: {v.vatNumber ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.categories.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Coverage: {v.coverageCities.join(", ") || "—"}</p>
                  <p className="mt-1 text-xs text-slate-400">Applied {format(v.createdAt, "dd MMM yyyy")}</p>
                  {v.documents.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{v.documents.length} document(s) uploaded</p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[v.status]}>{v.status.replace("_", " ")}</Badge>
              </div>

              <div className="mt-3 flex gap-2">
                {v.status === "PENDING" && (
                  <form action={underReview}><Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs">Start review</Button></form>
                )}
                {v.status !== "APPROVED" && (
                  <form action={approve}><Button type="submit" className="px-2.5 py-1 text-xs">Approve</Button></form>
                )}
                {v.status !== "SUSPENDED" && v.status === "APPROVED" && (
                  <form action={suspend}><Button type="submit" variant="danger" className="px-2.5 py-1 text-xs">Suspend</Button></form>
                )}
                {v.status !== "REJECTED" && v.status !== "APPROVED" && (
                  <form action={reject}><Button type="submit" variant="ghost" className="px-2.5 py-1 text-xs">Reject</Button></form>
                )}
              </div>
            </Card>
          );
        })}
        {vendors.length === 0 && <p className="text-sm text-slate-500">No vendor applications yet.</p>}
      </div>
    </div>
  );
}
