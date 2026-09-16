import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { evaluateSlaStage, DEFAULT_SLA_MINUTES } from "@/lib/sla";
import { canViewFinancials } from "@/lib/roles";
import { assignTechnician, assignVendor, updateWorkOrderStatus, completeWorkOrder, customerSignoff, addWorkOrderPhoto, deleteWorkOrderPhoto } from "@/server/work-orders";
import { ChecklistFieldInput, type ChecklistItem } from "@/components/checklist-field";
import { addPartUsedToWorkOrder } from "@/server/inventory";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { X } from "lucide-react";

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

const SLA_KEY = { on_track: "onTrack", at_risk: "atRisk", breached: "breached", met: "met", "n/a": "na" } as const;

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const [wo, t, tc, tws, twt, tp, tac, tsla] = await Promise.all([
    prisma.workOrder.findFirst({
      where: { id, orgId: session.orgId },
      include: {
        site: true,
        asset: true,
        assignedTechnician: true,
        assignedVendor: true,
        slaPolicy: true,
        request: true,
        pmSchedule: { include: { pmPlan: { include: { checklist: true } } } },
        partsUsed: { orderBy: { usedAt: "desc" } },
        photos: { orderBy: { uploadedAt: "desc" } },
      },
    }),
    getTranslations("workOrderDetail"),
    getTranslations("common"),
    getTranslations("workOrderStatus"),
    getTranslations("workOrderType"),
    getTranslations("priority"),
    getTranslations("assetCondition"),
    getTranslations("slaStage"),
  ]);
  if (!wo) notFound();

  const [technicians, blacklistedVendorIds, availableParts] = await Promise.all([
    prisma.technician.findMany({ where: { orgId: session.orgId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.vendorBlacklistEntry.findMany({ where: { orgId: session.orgId }, select: { vendorId: true } }),
    prisma.part.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
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

  const PHOTO_STAGE_LABEL: Record<string, string> = {
    BEFORE: t("stageBefore"),
    DURING: t("stageDuring"),
    AFTER: t("stageAfter"),
  };

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
          <Badge tone="blue">{tws(wo.status)}</Badge>
          <Badge tone={slaStage === "breached" ? "red" : slaStage === "at_risk" ? "amber" : "green"}>
            {t("sla")} {tsla(SLA_KEY[slaStage])}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("timeline")}</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-3 text-sm">
              <TimeStamp label={t("created")} value={wo.createdAt} />
              <TimeStamp label={t("responded")} value={wo.respondedAt} />
              <TimeStamp label={t("arrived")} value={wo.arrivedAt} />
              <TimeStamp label={t("started")} value={wo.startedAt} />
              <TimeStamp label={t("completed")} value={wo.completedAt} />
              <TimeStamp label={t("closed")} value={wo.closedAt} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("updateStatus")}</h2>
            </CardHeader>
            <CardBody>
              <form action={async (formData) => {
                "use server";
                await updateWorkOrderStatus(wo.id, formData.get("status") as never);
              }} className="flex items-end gap-3">
                <Field label={tc("status")} htmlFor="status">
                  <Select id="status" name="status" defaultValue={wo.status}>
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {tws(s)}
                      </option>
                    ))}
                    <option value="REOPENED">{tws("REOPENED")}</option>
                    <option value="CANCELLED">{tws("CANCELLED")}</option>
                  </Select>
                </Field>
                <Button type="submit" variant="secondary">
                  {t("update")}
                </Button>
              </form>
            </CardBody>
          </Card>

          {["IN_PROGRESS", "TESTING", "WAITING_PARTS", "DIAGNOSIS"].includes(wo.status) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("completeJob")}</h2>
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
                          <ChecklistFieldInput key={item.id} item={item} orgId={session.orgId} />
                        ))}
                      </div>
                    </div>
                  )}
                  <Field label={t("rootCause")} htmlFor="rootCause">
                    <Textarea id="rootCause" name="rootCause" rows={2} />
                  </Field>
                  <Field label={t("correctiveAction")} htmlFor="correctiveAction">
                    <Textarea id="correctiveAction" name="correctiveAction" rows={2} />
                  </Field>
                  <Field label={t("recommendation")} htmlFor="recommendation">
                    <Textarea id="recommendation" name="recommendation" rows={2} />
                  </Field>
                  <Field label={t("assetConditionAfter")} htmlFor="assetConditionAfter">
                    <Select id="assetConditionAfter" name="assetConditionAfter" defaultValue="">
                      <option value="">{t("noChange")}</option>
                      <option value="EXCELLENT">{tac("EXCELLENT")}</option>
                      <option value="GOOD">{tac("GOOD")}</option>
                      <option value="FAIR">{tac("FAIR")}</option>
                      <option value="POOR">{tac("POOR")}</option>
                      <option value="CRITICAL">{tac("CRITICAL")}</option>
                    </Select>
                  </Field>
                  {showFinancials && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label={t("laborCost")} htmlFor="laborCostSar">
                        <Input id="laborCostSar" name="laborCostSar" type="number" step="0.01" />
                      </Field>
                      <Field label={t("partsCost")} htmlFor="partsCostSar">
                        <Input id="partsCostSar" name="partsCostSar" type="number" step="0.01" />
                      </Field>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="safetyIncidentReported" />
                    {t("safetyIncident")}
                  </label>
                  <Button type="submit">{t("markCompleted")}</Button>
                </form>
              </CardBody>
            </Card>
          )}

          {(wo.status === "COMPLETED" || wo.status === "CUSTOMER_VERIFICATION") && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("customerSignoff")}</h2>
              </CardHeader>
              <CardBody>
                <form action={signoffAction} className="space-y-4">
                  <Field label={t("decision")} htmlFor="decision">
                    <Select id="decision" name="decision" defaultValue="APPROVED">
                      <option value="APPROVED">{t("decisionApprove")}</option>
                      <option value="REJECTED">{t("decisionReject")}</option>
                      <option value="REOPENED">{t("decisionReopen")}</option>
                    </Select>
                  </Field>
                  <Field label={t("rating")} htmlFor="rating">
                    <Select id="rating" name="rating" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} {n > 1 ? t("stars") : t("star")}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button type="submit">{t("submitSignoff")}</Button>
                </form>
              </CardBody>
            </Card>
          )}

          {(wo.rootCause || wo.correctiveAction) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("completionNotes")}</h2>
              </CardHeader>
              <CardBody className="space-y-2 text-sm text-slate-700">
                {wo.rootCause && <p><strong>{t("rootCause")}:</strong> {wo.rootCause}</p>}
                {wo.correctiveAction && <p><strong>{t("correctiveAction")}:</strong> {wo.correctiveAction}</p>}
                {wo.recommendation && <p><strong>{t("recommendation")}:</strong> {wo.recommendation}</p>}
                {showFinancials && wo.totalCostSar != null && (
                  <p><strong>{t("totalCost")}:</strong> SAR {Number(wo.totalCostSar).toLocaleString()}</p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{t("partsUsed")}</h2>
              <Link href={`/app/procurement/new?workOrderId=${wo.id}`} className="text-xs text-blue-700">
                {t("requestMaterials")}
              </Link>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {wo.partsUsed.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span>{p.partName} × {p.quantity}</span>
                  {showFinancials && p.unitCostSar != null && (
                    <span className="text-slate-500">SAR {(Number(p.unitCostSar) * p.quantity).toLocaleString()}</span>
                  )}
                </div>
              ))}
              {wo.partsUsed.length === 0 && <p className="p-5 text-sm text-slate-500">{t("noPartsLogged")}</p>}
            </div>
            <CardBody>
              <form action={addPartUsedToWorkOrder.bind(null, wo.id)} className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Select name="partId" defaultValue="" className="text-sm">
                  <option value="">{t("adHoc")}</option>
                  {availableParts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stockQuantity} {t("inStock")})</option>
                  ))}
                </Select>
                <Input name="quantity" type="number" min="1" defaultValue="1" className="w-20 px-2 py-1.5" />
                <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">{tc("add")}</Button>
                <Input name="partName" placeholder={t("partNamePlaceholder")} className="col-span-2 px-2 py-1.5" />
                <Input name="unitCostSar" type="number" step="0.01" placeholder={t("costPlaceholder")} className="px-2 py-1.5" />
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("photos")}</h2>
            </CardHeader>
            {wo.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 p-5 pb-0 sm:grid-cols-4">
                {wo.photos.map((p) => (
                  <div key={p.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.stage} className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                    <span className="absolute start-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {PHOTO_STAGE_LABEL[p.stage] ?? p.stage}
                    </span>
                    <form
                      action={deleteWorkOrderPhoto.bind(null, p.id)}
                      className="absolute end-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <button type="submit" className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700">
                        <X size={11} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <CardBody>
              <form action={addWorkOrderPhoto.bind(null, wo.id)} className="flex flex-wrap items-end gap-3">
                <Field label={t("stage")} htmlFor="stage">
                  <Select id="stage" name="stage" defaultValue="BEFORE" className="w-32">
                    <option value="BEFORE">{t("stageBefore")}</option>
                    <option value="DURING">{t("stageDuring")}</option>
                    <option value="AFTER">{t("stageAfter")}</option>
                  </Select>
                </Field>
                <PhotoUploadField name="url" orgId={session.orgId} />
                <Button type="submit" variant="secondary">
                  {t("addPhoto")}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("internalTechnician")}</h2>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-slate-700">
                {wo.assignedTechnician ? wo.assignedTechnician.name : tc("unassigned")}
              </p>
              <form action={assignAction} className="flex gap-2">
                <Select name="technicianId" defaultValue={wo.assignedTechnicianId ?? ""} className="flex-1">
                  <option value="" disabled>
                    {t("selectTechnician")}
                  </option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} — {tech.trade}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary">
                  {t("assign")}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("externalVendor")}</h2>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-slate-700">
                {wo.assignedVendor ? wo.assignedVendor.name : t("noVendorNeeded")}
              </p>
              {vendorOptions.length > 0 ? (
                <form action={assignVendorAction} className="flex gap-2">
                  <Select name="vendorId" defaultValue={wo.assignedVendorId ?? ""} className="flex-1">
                    <option value="" disabled>
                      {t("selectVendor")}
                    </option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.coverageCities.includes(wo.site.city) ? "" : t("noCoverageMatch")}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">
                    {t("assign")}
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("noApprovedVendors")}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("details")}</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Info label={tc("type")} value={twt(wo.type)} />
              <Info label={tc("priority")} value={tp(wo.priority)} />
              <Info label={tc("category")} value={wo.category ?? "—"} />
              {wo.request && (
                <Info label={t("sourceRequest")} value={wo.request.referenceNumber} />
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
