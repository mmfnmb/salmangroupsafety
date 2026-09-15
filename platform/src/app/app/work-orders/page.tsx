import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evaluateSlaStage, DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "amber" | "red" | "purple"> = {
  NEW: "amber",
  ASSIGNED: "blue",
  ACCEPTED: "blue",
  EN_ROUTE: "blue",
  ON_SITE: "blue",
  DIAGNOSIS: "purple",
  WAITING_APPROVAL: "amber",
  WAITING_PARTS: "amber",
  IN_PROGRESS: "blue",
  TESTING: "purple",
  COMPLETED: "green",
  CUSTOMER_VERIFICATION: "green",
  CLOSED: "slate",
  REOPENED: "red",
  CANCELLED: "slate",
};

const SLA_TONE = { on_track: "green", at_risk: "amber", breached: "red", met: "green", "n/a": "slate" } as const;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string; status?: string }>;
}) {
  const session = await requireOrgSession();
  const params = await searchParams;

  const workOrders = await prisma.workOrder.findMany({
    where: {
      orgId: session.orgId,
      assetId: params.assetId || undefined,
      status: (params.status as never) || undefined,
    },
    include: { site: true, asset: true, assignedTechnician: true, slaPolicy: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Work Orders</h1>
        <p className="text-sm text-slate-500">{workOrders.length} in view</p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Number</th>
              <th className="px-4 py-2 text-start">Description</th>
              <th className="px-4 py-2 text-start">Site / Asset</th>
              <th className="px-4 py-2 text-start">Technician</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">SLA</th>
              <th className="px-4 py-2 text-start">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workOrders.map((wo) => {
              const resolutionMinutes = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
              const slaStage = evaluateSlaStage({
                createdAt: wo.createdAt,
                actualAt: wo.completedAt,
                allottedMinutes: resolutionMinutes,
              });
              return (
                <tr key={wo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/work-orders/${wo.id}`} className="font-mono text-xs text-blue-700">
                      {wo.number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-800">{wo.description}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {wo.site.name}
                    {wo.asset ? ` · ${wo.asset.assetCode}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{wo.assignedTechnician?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[wo.status]}>{wo.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={SLA_TONE[slaStage]}>{slaStage.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{format(wo.createdAt, "dd MMM, HH:mm")}</td>
                </tr>
              );
            })}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No work orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
