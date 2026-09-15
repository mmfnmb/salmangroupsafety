import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createInternalRequest } from "@/server/requests";

export default async function NewInternalRequestPage() {
  const session = await requireOrgSession();
  const sites = await prisma.site.findMany({
    where: { orgId: session.orgId },
    include: { assets: { select: { id: true, name: true, assetCode: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Log a maintenance request</h1>
      <Card>
        <CardBody>
          <form action={createInternalRequest} className="space-y-4">
            <Field label="Site" htmlFor="siteId" required>
              <Select id="siteId" name="siteId" required defaultValue="">
                <option value="" disabled>
                  Select site
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Asset (optional)" htmlFor="assetId">
              <Select id="assetId" name="assetId" defaultValue="">
                <option value="">Unknown / not asset-specific</option>
                {sites.flatMap((s) =>
                  s.assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} — {a.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" name="category" placeholder="e.g. HVAC, Electrical, Plumbing" />
            </Field>
            <Field label="Description" htmlFor="description" required>
              <Textarea id="description" name="description" required rows={4} />
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
            <Button type="submit" className="w-full">
              Submit request
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
