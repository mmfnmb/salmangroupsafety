import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createPMPlan } from "@/server/pm";
import { redirect } from "next/navigation";

export default async function NewPMPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const session = await requireOrgSession();
  const { assetId } = await searchParams;

  const [assets, checklists, technicians] = await Promise.all([
    prisma.asset.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
    prisma.checklist.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
    prisma.technician.findMany({ where: { orgId: session.orgId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  if (assets.length === 0) redirect("/app/assets/new");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New PM plan</h1>
      <Card>
        <CardBody>
          <form action={createPMPlan} className="space-y-4">
            <Field label="Asset" htmlFor="assetId" required>
              <Select id="assetId" name="assetId" required defaultValue={assetId ?? ""}>
                <option value="" disabled>
                  Select asset
                </option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plan name" htmlFor="name" required>
              <Input id="name" name="name" placeholder="Monthly filter inspection" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Frequency" htmlFor="frequency">
                <Select id="frequency" name="frequency" defaultValue="MONTHLY">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMIANNUAL">Semiannual</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="METER_BASED">Meter-based</option>
                </Select>
              </Field>
              <Field label="Every N periods" htmlFor="intervalValue">
                <Input id="intervalValue" name="intervalValue" type="number" min="1" defaultValue="1" />
              </Field>
            </div>
            <Field label="Checklist (optional)" htmlFor="checklistId">
              <Select id="checklistId" name="checklistId" defaultValue="">
                <option value="">None</option>
                {checklists.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assigned technician (optional)" htmlFor="assignedTechnicianId">
              <Select id="assignedTechnicianId" name="assignedTechnicianId" defaultValue="">
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.trade}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimated duration (minutes)" htmlFor="estimatedDurationMinutes">
              <Input id="estimatedDurationMinutes" name="estimatedDurationMinutes" type="number" min="1" />
            </Field>
            <Field label="Instructions" htmlFor="instructions">
              <Textarea id="instructions" name="instructions" rows={3} />
            </Field>
            <Button type="submit" className="w-full">
              Create PM plan
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
