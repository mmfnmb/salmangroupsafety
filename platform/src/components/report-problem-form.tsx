"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createPublicRequest } from "@/server/requests";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PhotoUploadField } from "@/components/photo-upload-field";

export function ReportProblemForm({
  orgId,
  siteId,
  assetId,
  sites,
  source,
}: {
  orgId: string;
  siteId?: string;
  assetId?: string;
  sites?: { id: string; name: string }[];
  source: "QR_SCAN" | "PUBLIC_PORTAL";
}) {
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations("requestForm");
  const tc = useTranslations("common");

  return (
    <form
      action={createPublicRequest}
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="source" value={source} />
      {assetId && <input type="hidden" name="assetId" value={assetId} />}

      {sites ? (
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
      ) : (
        siteId && <input type="hidden" name="siteId" value={siteId} />
      )}

      <Field label={t("yourName")} htmlFor="requesterName" required>
        <Input id="requesterName" name="requesterName" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("mobileNumber")} htmlFor="requesterPhone">
          <Input id="requesterPhone" name="requesterPhone" type="tel" placeholder="05XXXXXXXX" />
        </Field>
        <Field label={t("email")} htmlFor="requesterEmail">
          <Input id="requesterEmail" name="requesterEmail" type="email" />
        </Field>
      </div>
      <Field label={t("whatsWrong")} htmlFor="description" required>
        <Textarea id="description" name="description" required rows={3} />
      </Field>
      <Field label={tc("priority")} htmlFor="priority">
        <Select id="priority" name="priority" defaultValue="NORMAL">
          <option value="LOW">{t("priorityLow")}</option>
          <option value="NORMAL">{t("priorityNormal")}</option>
          <option value="HIGH">{t("priorityHigh")}</option>
          <option value="EMERGENCY">{t("priorityEmergency")}</option>
          <option value="CRITICAL">{t("priorityCritical")}</option>
        </Select>
      </Field>
      <PhotoUploadField name="photoUrl" orgId={orgId} label={t("photoOptional")} />
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
