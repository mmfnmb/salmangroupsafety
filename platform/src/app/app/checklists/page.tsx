import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createChecklist } from "@/server/checklists";
import type { ChecklistItem } from "@/components/checklist-field";
import { getTranslations } from "next-intl/server";

export default async function ChecklistsPage() {
  const session = await requireOrgSession();
  const [checklists, t] = await Promise.all([
    prisma.checklist.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("checklistsPage"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>

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
          {checklists.length === 0 && <p className="text-sm text-slate-500">{t("noChecklists")}</p>}
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("newChecklist")}</h2>
            </CardHeader>
            <CardBody>
              <form action={createChecklist} className="space-y-4">
                <Field label={t("checklistName")} htmlFor="name" required>
                  <Input id="name" name="name" placeholder={t("checklistNamePlaceholder")} required />
                </Field>
                <Field label={t("itemsLabel")} htmlFor="items" required>
                  <Textarea id="items" name="items" rows={6} required placeholder={"Check refrigerant pressure\nInspect filters\nTest thermostat"} />
                </Field>
                <Field label={t("itemType")} htmlFor="itemType">
                  <Select id="itemType" name="itemType" defaultValue="PASS_FAIL">
                    <option value="PASS_FAIL">{t("typePassFail")}</option>
                    <option value="YES_NO">{t("typeYesNo")}</option>
                    <option value="NUMERIC">{t("typeNumeric")}</option>
                    <option value="TEXT">{t("typeText")}</option>
                    <option value="PHOTO_REQUIRED">{t("typePhotoRequired")}</option>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="required" defaultChecked />
                  {t("mandatoryEvidence")}
                </label>
                <Button type="submit" className="w-full">
                  {t("createChecklist")}
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
