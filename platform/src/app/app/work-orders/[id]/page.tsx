import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { evaluateSlaStage, DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { canViewFinancials } from "@/lib/roles";
import { assignTechnician, assignVendor, updateWorkOrderStatus, completeWorkOrder, customerSignoff } from "@/server/work-orders";
import { ChecklistFieldInput, type ChecklistItem } from "@/components/checklist-field";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_FLOW = [
  "NEW",
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SITE",
  "DIAGNOSIS",
  "WAITING_APPROVAL",
  "WAITING_PARTS",
  "IN_PROGRESS",
  "TESTING",
  "COMPLETED",
  "CUSTOMER_VERIFICATION",
  "CLOSED",
] as const;

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const wo = await prisma.workOrder.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      site: true,
      asset: true,
      assignedTechnician: true,
      assignedVendor: true,
      slaPolicy: true,
      request: true,
      pmSchedule: { include: { pmPlan: { include: { checklist: true } } } },
    },
  });
  if (!wo) notFound();

  const [technicians, blacklistedVendorIds] = await Promise.all([
    prisma.technician.findMany({ where: { orgId: session.orgId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.vendorBlacklistEntry.findMany({ where: { orgId: session.orgId }, select: { vendorId: true } }),
  ]);
  const blacklistedIds = new Set(blacklistedVendorIds.map((b) => b.vendorId));
  const allApprovedVendors = await prisma.vendor.findMany({
    where: { status: "APPROVED", id: { notIn: [...blacklistedIds] } },
    orderBy: { name: "asc" },
  });
  const matchingVendors = allApprovedVendors.filter((v) => v.coverageCities.includes(wo.site.city));
  const vendorOptions = matchingVendors.length > 0 ? matchingVendors : allApprovedVendors;

  const resolutionMinutes = wo.slaPolicy?.resolutionMinutes ?? DEFAULT_SLA_MINUTES[wo.priority].resolution;
  const slaStage = evaluateSlaStage({ createdAt: wo.createdAt, actualAt: wo.completedAt, allottedMinutes: resolutionMinutes });
  const showFinancials = canViewFinancials(session.role);

  const assignAction = assignTechnician.bind(null, wo.id);
  const assignVendorAction = assignVendor.bind(null, wo.id);
  const completeAction = completeWorkOrder.bind(null, wo.id);
  const signoffAction = customerSignoff.bind(null, wo.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{wo.number}</p>
          <h1 className="text-xl font-semibold text-slate-900">{wo.description}</h1>
          <p className="text-sm text-slate-500">
            {wo.site.name}
            {wo.asset && (
              <>
                {" · "}
                <Link href={`/app/assets/${wo.asset.id}`} className="text-blue-700">
                  {wo.asset.assetCode}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="blue">{wo.status.replace(/_/g, " ")}</Badge>
          <Badge tone={slaStage === "breached" ? "red" : slaStage === "at_risk" ? "amber" : "green"}>
            SLA {slaStage.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-3 text-sm">
              <TimeStamp label="Created" value={wo.createdAt} />
              <TimeStamp label="Responded" value={wo.respondedAt} />
              <TimeStamp label="Arrived" value={wo.arrivedAt} />
              <TimeStamp label="Started" value={wo.startedAt} />
              <TimeStamp label="Completed" value={wo.completedAt} />
              <TimeStamp label="Closed" value={wo.closedAt} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Update status</h2>
            </CardHeader>
            <CardBody>
              <form action={async (formData) => {
                "use server";
                await updateWorkOrderStatus(wo.id, formData.get("status") as never);
              }} className="flex items-end gap-3">
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue={wo.status}>
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                    <option value="REOPENED">REOPENED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </Select>
                </Field>
                <Button type="submit" variant="secondary">
                  Update
                </Button>
              </form>
            </CardBody>
          </Card>

          {["IN_PROGRESS", "TESTING", "WAITING_PARTS", "DIAGNOSIS"].includes(wo.status) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">Complete job</h2>
              </CardHeader>
              <CardBody>
                <form action={completeAction} className="space-y-4">
                  {wo.pmSchedule?.pmPlan.checklist && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <input type="hidden" name="checklistId" value={wo.pmSchedule.pmPlan.checklist.id} />
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        {wo.pmSchedule.pmPlan.checklist.name}
                      </p>
                      <div className="space-y-3">
                        {(wo.pmSchedule.pmPlan.checklist.items as ChecklistItem[]).map((item) => (
                          <ChecklistFieldInput key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                  <Field label="Root cause" htmlFor="rootCause">
                    <Textarea id="rootCause" name="rootCause" rows={2} />
                  </Field>
                  <Field label="Corrective action" htmlFor="correctiveAction">
                    <Textarea id="correctiveAction" name="correctiveAction" rows={2} />
                  </Field>
                  <Field label="Recommendation" htmlFor="recommendation">
                    <Textarea id="recommendation" name="recommendation" rows={2} />
                  </Field>
                  <Field label="Asset condition after repair" htmlFor="assetConditionAfter">
                    <Select id="assetConditionAfter" name="assetConditionAfter" defaultValue="">
                      <option value="">No change</option>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                      <option value="CRITICAL">Critical</option>
                    </Select>
                  </Field>
                  {showFinancials && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Labor cost (SAR)" htmlFor="laborCostSar">
                        <Input id="laborCostSar" name="laborCostSar" type="number" step="0.01" />
                      </Field>
                      <Field label="Parts cost (SAR)" htmlFor="partsCostSar">
                        <Input id="partsCostSar" name="partsCostSar" type="number" step="0.01" />
                      </Field>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="safetyIncidentReported" />
                    A safety incident occurred during this job
                  </label>
                  <Button type="submit">Mark completed</Button>
                </form>
              </CardBody>
            </Card>
          )}

          {(wo.status === "COMPLETED" || wo.status === "CUSTOMER_VERIFICATION") && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">Customer sign-off</h2>
              </CardHeader>
              <CardBody>
                <form action={signoffAction} className="space-y-4">
                  <Field label="Decision" htmlFor="decision">
                    <Select id="decision" name="decision" defaultValue="APPROVED">
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                      <option value="REOPENED">Reopen</option>
                    </Select>
                  </Field>
                  <Field label="Rating (1-5)" htmlFor="rating">
                    <Select id="rating" name="rating" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} star{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button type="submit">Submit sign-off</Button>
                </form>
              </CardBody>
            </Card>
          )}

          {(wo.rootCause || wo.correctiveAction) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">Completion notes</h2>
              </CardHeader>
              <CardBody className="space-y-2 text-sm text-slate-700">
                {wo.rootCause && <p><strong>Root cause:</strong> {wo.rootCause}</p>}
                {wo.correctiveAction && <p><strong>Corrective action:</strong> {wo.correctiveAction}</p>}
                {wo.recommendation && <p><strong>Recommendation:</strong> {wo.recommendation}</p>}
                {showFinancials && wo.totalCostSar != null && (
                  <p><strong>Total cost:</strong> SAR {Number(wo.totalCostSar).toLocaleString()}</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Internal technician</h2>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-slate-700">
                {wo.assignedTechnician ? wo.assignedTechnician.name : "Unassigned"}
              </p>
              <form action={assignAction} className="flex gap-2">
                <Select name="technicianId" defaultValue={wo.assignedTechnicianId ?? ""} className="flex-1">
                  <option value="" disabled>
                    Select technician
                  </option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.trade}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary">
                  Assign
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">External vendor</h2>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-slate-700">
                {wo.assignedVendor ? wo.assignedVendor.name : "No specialist contractor needed yet"}
              </p>
              {vendorOptions.length > 0 ? (
                <form action={assignVendorAction} className="flex gap-2">
                  <Select name="vendorId" defaultValue={wo.assignedVendorId ?? ""} className="flex-1">
                    <option value="" disabled>
                      Select vendor
                    </option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.coverageCities.includes(wo.site.city) ? "" : "(no coverage match)"}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">
                    Assign
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-slate-500">
                  No approved vendors yet in the Eastern Province network for this site.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Info label="Type" value={wo.type} />
              <Info label="Priority" value={wo.priority} />
              <Info label="Category" value={wo.category ?? "—"} />
              {wo.request && (
                <Info label="Source request" value={wo.request.referenceNumber} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimeStamp({ label, value }: { label: string; value: Date | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-800">{value ? format(value, "dd MMM, HH:mm") : "—"}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
