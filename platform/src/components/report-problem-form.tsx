"use client";

import { useState } from "react";
import { createPublicRequest } from "@/server/requests";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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
        <Field label="Site" htmlFor="siteId" required>
          <Select id="siteId" name="siteId" required defaultValue="">
            <option value="" disabled>
              Select a site
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

      <Field label="Your name" htmlFor="requesterName" required>
        <Input id="requesterName" name="requesterName" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mobile number" htmlFor="requesterPhone">
          <Input id="requesterPhone" name="requesterPhone" type="tel" placeholder="05XXXXXXXX" />
        </Field>
        <Field label="Email" htmlFor="requesterEmail">
          <Input id="requesterEmail" name="requesterEmail" type="email" />
        </Field>
      </div>
      <Field label="What's wrong?" htmlFor="description" required>
        <Textarea id="description" name="description" required rows={3} />
      </Field>
      <Field label="Priority" htmlFor="priority">
        <Select id="priority" name="priority" defaultValue="NORMAL">
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="CRITICAL">Critical / safety risk</option>
        </Select>
      </Field>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
