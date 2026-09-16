import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { convertRequestToWorkOrder, rejectRequest } from "@/server/requests";
import { AiTriageButton } from "@/components/ai-triage-button";
import { format } from "date-fns";
import Link from "next/link";

const PRIORITY_TONE = {
  LOW: "slate",
  NORMAL: "blue",
  HIGH: "amber",
  EMERGENCY: "red",
  CRITICAL: "red",
} as const;

export default async function RequestsPage() {
  const session = await requireOrgSession();
  const requests = await prisma.maintenanceRequest.findMany({
    where: { orgId: session.orgId },
    include: { site: true, asset: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Maintenance Requests</h1>
          <p className="text-sm text-slate-500">Incoming issues from QR scans, the public portal and staff.</p>
        </div>
        <LinkButton href="/app/requests/new">+ Log a request</LinkButton>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Reference</th>
              <th className="px-4 py-2 text-start">Description</th>
              <th className="px-4 py-2 text-start">Site / Asset</th>
              <th className="px-4 py-2 text-start">Priority</th>
              <th className="px-4 py-2 text-start">Source</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">Received</th>
              <th className="px-4 py-2 text-start">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => {
              const convert = convertRequestToWorkOrder.bind(null, r.id);
              const reject = rejectRequest.bind(null, r.id);
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.referenceNumber}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-800">{r.description}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.site.name}
                    {r.asset ? ` · ${r.asset.assetCode}` : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.source.replace("_", " ")}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={r.status === "NEW" ? "amber" : r.status === "CONVERTED" ? "green" : "slate"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{format(r.createdAt, "dd MMM, HH:mm")}</td>
                  <td className="px-4 py-2.5">
                    {r.status === "NEW" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <form action={convert}>
                            <Button type="submit" variant="primary" className="px-2 py-1 text-xs">
                              Convert to WO
                            </Button>
                          </form>
                          <Link
                            href={`/app/rfq/new?requestId=${r.id}`}
                            className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Send to vendors
                          </Link>
                          <form action={reject}>
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                              Reject
                            </Button>
                          </form>
                        </div>
                        <AiTriageButton requestId={r.id} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
