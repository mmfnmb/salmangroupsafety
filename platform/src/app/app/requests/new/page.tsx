import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { createInternalRequest } from "@/server/requests";
import { getTranslations } from "next-intl/server";

export default async function NewInternalRequestPage() {
  const session = await requireOrgSession();
  const [sites, t, tc, tp] = await Promise.all([
    prisma.site.findMany({
      where: { orgId: session.orgId },
      include: { assets: { select: { id: true, name: true, assetCode: true } } },
      orderBy: { name: "asc" },
    }),
    getTranslations("internalRequestForm"),
    getTranslations("common"),
    getTranslations("priority"),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">{t("title")}</h1>
      <Card>
        <CardBody>
          <form action={createInternalRequest} className="space-y-4">
            <Field label={tc("site")} htmlFor="siteId" required>
              <Select id="siteId" name="siteId" required defaultValue="">
                <option value="" disabled>
                  {t("selectSite")}
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("assetOptional")} htmlFor="assetId">
              <Select id="assetId" name="assetId" defaultValue="">
                <option value="">{t("unknownAsset")}</option>
                {sites.flatMap((s) =>
                  s.assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} — {a.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Field label={tc("category")} htmlFor="category">
              <Input id="category" name="category" placeholder={t("categoryPlaceholder")} />
            </Field>
            <Field label={t("description")} htmlFor="description" required>
              <Textarea id="description" name="description" required rows={4} />
            </Field>
            <Field label={tc("priority")} htmlFor="priority">
              <Select id="priority" name="priority" defaultValue="NORMAL">
                <option value="LOW">{tp("LOW")}</option>
                <option value="NORMAL">{tp("NORMAL")}</option>
                <option value="HIGH">{tp("HIGH")}</option>
                <option value="EMERGENCY">{tp("EMERGENCY")}</option>
                <option value="CRITICAL">{tp("CRITICAL")}</option>
              </Select>
            </Field>
            <PhotoUploadField name="photoUrl" orgId={session.orgId} label={t("photoOptional")} />
            <Button type="submit" className="w-full">
              {t("submit")}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
