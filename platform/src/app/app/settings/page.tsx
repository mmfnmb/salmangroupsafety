import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg, CUSTOMER_ROLES } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import {
  updateOrgProfile,
  upsertSlaPolicy,
  createApprovalThreshold,
  deleteApprovalThreshold,
  inviteTeamMember,
  suspendTeamMember,
  reactivateTeamMember,
} from "@/server/settings";
import type { RequestPriority } from "@/generated/prisma/client";
import { ShieldAlert, KeyRound } from "lucide-react";

const PRIORITIES: RequestPriority[] = ["LOW", "NORMAL", "HIGH", "EMERGENCY", "CRITICAL"];

const APPROVAL_SCOPES = ["WORK_ORDER", "QUOTATION", "AWARD", "INVOICE", "REPLACEMENT"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; tempPassword?: string }>;
}) {
  const session = await requireOrgSession();
  const canEdit = canManageOrg(session.role);
  const { invited, tempPassword } = await searchParams;

  const [org, slaPolicies, thresholds, team] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    prisma.slaPolicy.findMany({ where: { orgId: session.orgId } }),
    prisma.approvalThreshold.findMany({ where: { orgId: session.orgId }, orderBy: { minAmountSar: "asc" } }),
    prisma.user.findMany({ where: { orgId: session.orgId }, orderBy: [{ status: "asc" }, { name: "asc" }] }),
  ]);

  const slaByPriority = new Map(slaPolicies.map((p) => [p.priority, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Organization profile, SLA policies, approval thresholds and team access.</p>
      </div>

      {invited && tempPassword && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody className="flex items-start gap-3">
            <KeyRound size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <div className="text-sm text-emerald-900">
              <p className="font-medium">Invited {invited}</p>
              <p className="mt-1">
                Temporary password: <span className="rounded bg-white px-1.5 py-0.5 font-mono">{tempPassword}</span> — share it
                securely. It is shown only once and will not be recoverable afterwards.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {!canEdit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardBody className="flex items-center gap-3 text-sm text-amber-900">
            <ShieldAlert size={16} />
            Your role can view these settings but only Account Owners, Facility Managers and Maintenance Managers can change them.
          </CardBody>
        </Card>
      )}

      <div id="profile" className="scroll-mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Organization profile</h2>
          </CardHeader>
          <CardBody>
            <form action={updateOrgProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name (English)" htmlFor="name" required>
                <Input id="name" name="name" defaultValue={org.name} required disabled={!canEdit} />
              </Field>
              <Field label="Name (Arabic)" htmlFor="nameAr">
                <Input id="nameAr" name="nameAr" dir="rtl" defaultValue={org.nameAr ?? ""} disabled={!canEdit} />
              </Field>
              <Field label="City" htmlFor="city">
                <Input id="city" name="city" defaultValue={org.city ?? ""} disabled={!canEdit} />
              </Field>
              <Field label="Industry" htmlFor="industry">
                <Select id="industry" name="industry" defaultValue={org.industry} disabled={!canEdit}>
                  {["MANUFACTURING","WAREHOUSE_LOGISTICS","STAFF_ACCOMMODATION","COMMERCIAL_BUILDING","HEALTHCARE","EDUCATION","RETAIL","HOSPITALITY","OFFICE","PROPERTY_PORTFOLIO","WORKSHOP","BUSINESS_PARK","OTHER"].map((i) => (
                    <option key={i} value={i}>{i.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </Field>
              <Field label="CR Number" htmlFor="crNumber">
                <Input id="crNumber" name="crNumber" defaultValue={org.crNumber ?? ""} disabled={!canEdit} />
              </Field>
              <Field label="VAT Number" htmlFor="vatNumber">
                <Input id="vatNumber" name="vatNumber" defaultValue={org.vatNumber ?? ""} disabled={!canEdit} />
              </Field>
              {canEdit && (
                <div className="sm:col-span-2">
                  <Button type="submit">Save profile</Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>
      </div>

      <div id="sla" className="scroll-mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">SLA policies</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {PRIORITIES.map((priority) => {
              const existing = slaByPriority.get(priority);
              return (
                <form key={priority} action={upsertSlaPolicy} className="grid grid-cols-2 items-end gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0 sm:grid-cols-5">
                  <input type="hidden" name="priority" value={priority} />
                  <div className="sm:col-span-1">
                    <Badge tone={priority === "EMERGENCY" || priority === "CRITICAL" ? "red" : priority === "HIGH" ? "amber" : "slate"}>
                      {priority}
                    </Badge>
                  </div>
                  <Field label="Response (min)" htmlFor={`response-${priority}`}>
                    <Input id={`response-${priority}`} name="responseMinutes" type="number" min="1" defaultValue={existing?.responseMinutes} disabled={!canEdit} />
                  </Field>
                  <Field label="Arrival (min)" htmlFor={`arrival-${priority}`}>
                    <Input id={`arrival-${priority}`} name="arrivalMinutes" type="number" min="1" defaultValue={existing?.arrivalMinutes} disabled={!canEdit} />
                  </Field>
                  <Field label="Resolution (min)" htmlFor={`resolution-${priority}`}>
                    <Input id={`resolution-${priority}`} name="resolutionMinutes" type="number" min="1" defaultValue={existing?.resolutionMinutes} disabled={!canEdit} />
                  </Field>
                  {canEdit && (
                    <Button type="submit" variant="secondary" className="justify-self-start">
                      Save
                    </Button>
                  )}
                </form>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div id="approvals" className="scroll-mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Approval thresholds</h2>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {thresholds.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {t.scope.replace(/_/g, " ")} — SAR {Number(t.minAmountSar).toLocaleString()}
                    {t.maxAmountSar ? ` – ${Number(t.maxAmountSar).toLocaleString()}` : "+"}
                  </p>
                  <p className="text-xs text-slate-500">Requires approval from {t.requiredRole.replace(/_/g, " ")}</p>
                </div>
                {canEdit && (
                  <form action={deleteApprovalThreshold.bind(null, t.id)}>
                    <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            ))}
            {thresholds.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No thresholds configured — the platform default (owner approval above SAR 10,000) applies.
              </p>
            )}
          </div>
          {canEdit && (
            <CardBody className="border-t border-slate-100">
              <form action={createApprovalThreshold} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
                <Field label="Scope" htmlFor="scope">
                  <Select id="scope" name="scope" defaultValue="AWARD">
                    {APPROVAL_SCOPES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Min amount (SAR)" htmlFor="minAmountSar">
                  <Input id="minAmountSar" name="minAmountSar" type="number" min="0" step="0.01" required />
                </Field>
                <Field label="Max amount (SAR, optional)" htmlFor="maxAmountSar">
                  <Input id="maxAmountSar" name="maxAmountSar" type="number" min="0" step="0.01" />
                </Field>
                <Field label="Required role" htmlFor="requiredRole">
                  <Select id="requiredRole" name="requiredRole" defaultValue="ACCOUNT_OWNER">
                    {CUSTOMER_ROLES.map((r) => (
                      <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="secondary">Add threshold</Button>
              </form>
            </CardBody>
          )}
        </Card>
      </div>

      <div id="team" className="scroll-mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Team</h2>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {team.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} · {u.role.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "INVITED" ? "blue" : "red"}>{u.status}</Badge>
                  {canEdit && u.id !== session.userId && (
                    <form action={(u.status === "SUSPENDED" ? reactivateTeamMember : suspendTeamMember).bind(null, u.id)}>
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
          {canEdit && (
            <CardBody className="border-t border-slate-100">
              <form action={inviteTeamMember} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                <Field label="Name" htmlFor="inviteName">
                  <Input id="inviteName" name="name" required />
                </Field>
                <Field label="Email" htmlFor="inviteEmail">
                  <Input id="inviteEmail" name="email" type="email" required />
                </Field>
                <Field label="Role" htmlFor="inviteRole">
                  <Select id="inviteRole" name="role" defaultValue="TECHNICIAN">
                    {CUSTOMER_ROLES.map((r) => (
                      <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="secondary">Invite</Button>
              </form>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
