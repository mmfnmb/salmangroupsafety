import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createChecklist } from "@/server/checklists";
import type { ChecklistItem } from "@/components/checklist-field";

export default async function ChecklistsPage() {
  const session = await requireOrgSession();
  const checklists = await prisma.checklist.findMany({
    where: { orgId: session.orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Checklists</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {checklists.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{c.name}</h2>
              </CardHeader>
              <CardBody>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                  {(c.items as ChecklistItem[]).map((item) => (
                    <li key={item.id}>
                      {item.label} <span className="text-xs text-slate-400">({item.type})</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
          {checklists.length === 0 && <p className="text-sm text-slate-500">No checklists yet.</p>}
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">New checklist</h2>
            </CardHeader>
            <CardBody>
              <form action={createChecklist} className="space-y-4">
                <Field label="Checklist name" htmlFor="name" required>
                  <Input id="name" name="name" placeholder="Monthly HVAC Inspection" required />
                </Field>
                <Field label="Items (one per line)" htmlFor="items" required>
                  <Textarea id="items" name="items" rows={6} required placeholder={"Check refrigerant pressure\nInspect filters\nTest thermostat"} />
                </Field>
                <Field label="Item type" htmlFor="itemType">
                  <Select id="itemType" name="itemType" defaultValue="PASS_FAIL">
                    <option value="PASS_FAIL">Pass / Fail</option>
                    <option value="YES_NO">Yes / No</option>
                    <option value="NUMERIC">Numeric reading</option>
                    <option value="TEXT">Text</option>
                    <option value="PHOTO_REQUIRED">Photo required</option>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="required" defaultChecked />
                  Mandatory evidence for all items
                </label>
                <Button type="submit" className="w-full">
                  Create checklist
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
