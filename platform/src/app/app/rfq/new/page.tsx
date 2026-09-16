import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createRfq } from "@/server/rfq";
import { AiScopeDraftButton } from "@/components/ai-scope-draft-button";

export default async function NewRfqPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const session = await requireOrgSession();
  const { requestId } = await searchParams;

  const [sites, request] = await Promise.all([
    prisma.site.findMany({
      where: { orgId: session.orgId },
      include: { assets: { select: { id: true, name: true, assetCode: true } } },
      orderBy: { name: "asc" },
    }),
    requestId
      ? prisma.maintenanceRequest.findFirst({ where: { id: requestId, orgId: session.orgId } })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">New RFQ</h1>
      <p className="mb-6 text-sm text-slate-500">
        For work your internal team can&apos;t cover — invite specialist contractors to quote.
      </p>
      <Card>
        <CardBody>
          <form action={createRfq} className="space-y-4">
            {request && <input type="hidden" name="requestId" value={request.id} />}
            <Field label="Site" htmlFor="siteId" required>
              <Select id="siteId" name="siteId" required defaultValue={request?.siteId ?? ""}>
                <option value="" disabled>Select site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Asset (optional)" htmlFor="assetId">
              <Select id="assetId" name="assetId" defaultValue={request?.assetId ?? ""}>
                <option value="">Not asset-specific</option>
                {sites.flatMap((s) =>
                  s.assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.assetCode} — {a.name}</option>
                  ))
                )}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" name="category" placeholder="e.g. Fire Fighting, HVAC, Elevators" defaultValue={request?.category ?? ""} />
            </Field>
            <Field label="Title" htmlFor="title" required>
              <Input id="title" name="title" placeholder="Short summary of the job" required />
            </Field>
            <Field label="Scope of work" htmlFor="scopeOfWork" required>
              <Textarea
                id="scopeOfWork"
                name="scopeOfWork"
                rows={6}
                required
                defaultValue={request?.description ?? ""}
                placeholder="Describe the problem, required inspection/repair, materials, testing and any exclusions."
              />
              <div className="mt-2">
                <AiScopeDraftButton
                  assetSelectId="assetId"
                  titleInputId="title"
                  categoryInputId="category"
                  targetTextareaId="scopeOfWork"
                />
              </div>
            </Field>
            <Field label="Quote deadline (optional)" htmlFor="quoteDeadline">
              <Input id="quoteDeadline" name="quoteDeadline" type="date" />
            </Field>
            <Button type="submit" className="w-full">Create RFQ</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
