import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { approvePurchaseRequest, rejectPurchaseRequest } from "@/server/procurement";
import { format } from "date-fns";
import Link from "next/link";

const SUPERVISORY_ROLES = ["ACCOUNT_OWNER", "FACILITY_MANAGER", "MAINTENANCE_MANAGER", "MAINTENANCE_SUPERVISOR"];

export default async function PurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      site: true,
      part: true,
      workOrder: true,
      requestedByUser: true,
      decidedByUser: true,
      purchaseOrder: true,
    },
  });
  if (!pr) notFound();

  const canDecide = SUPERVISORY_ROLES.includes(session.role) && pr.status === "PENDING_APPROVAL";
  const approveAction = approvePurchaseRequest.bind(null, pr.id);
  const rejectAction = rejectPurchaseRequest.bind(null, pr.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{pr.requestNumber}</p>
          <h1 className="text-xl font-semibold text-slate-900">{pr.itemName}</h1>
          <p className="text-sm text-slate-500">{pr.site.name} · requested by {pr.requestedByUser.name}</p>
        </div>
        <Badge tone={pr.status === "REJECTED" ? "red" : pr.status.includes("SUPPLIED") || pr.status === "FULFILLED_FROM_STOCK" ? "green" : "amber"}>
          {pr.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-900">Request details</h2></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Quantity" value={`${pr.quantity}${pr.unit ? ` ${pr.unit}` : ""}`} />
          <Info label="Category" value={pr.category ?? "—"} />
          <Info label="Linked work order" value={pr.workOrder ? pr.workOrder.number : "—"} />
          <Info label="Stock available at request" value={pr.stockAvailableAtRequest ? "Yes" : "No"} />
          <Info label="Requested" value={format(pr.createdAt, "dd MMM yyyy, HH:mm")} />
          <Info label="Decided" value={pr.decidedAt ? format(pr.decidedAt, "dd MMM yyyy, HH:mm") : "—"} />
          {pr.notes && <p className="col-span-2 text-slate-600">{pr.notes}</p>}
        </CardBody>
      </Card>

      {pr.status === "FULFILLED_FROM_STOCK" && (
        <Card className="border-green-300 bg-green-50/40">
          <CardBody>
            <p className="text-sm text-slate-700">
              Automatically fulfilled from inventory — enough stock was available, so this request needed no approval.
            </p>
          </CardBody>
        </Card>
      )}

      {canDecide && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-900">Decision needed</h2></CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">Insufficient stock — approve to raise a purchase order, or reject.</p>
            <div className="flex gap-3">
              <form action={approveAction}>
                <Button type="submit">Approve → Create Purchase Order</Button>
              </form>
              <form action={rejectAction} className="flex items-center gap-2">
                <Textarea name="reason" placeholder="Reason (optional)" rows={1} className="w-56" />
                <Button type="submit" variant="danger">Reject</Button>
              </form>
            </div>
          </CardBody>
        </Card>
      )}

      {pr.purchaseOrder && (
        <Card>
          <CardBody className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Purchase order <span className="font-mono">{pr.purchaseOrder.orderNumber}</span> was raised for this request.</p>
            <Link href={`/app/procurement/orders/${pr.purchaseOrder.id}`} className="text-sm font-medium text-blue-700">Open →</Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
