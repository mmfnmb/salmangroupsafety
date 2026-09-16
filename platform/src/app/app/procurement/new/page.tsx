import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createPurchaseRequest } from "@/server/procurement";

export default async function NewPurchaseRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string }>;
}) {
  const session = await requireOrgSession();
  const { workOrderId } = await searchParams;

  const [sites, parts, workOrder] = await Promise.all([
    prisma.site.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
    prisma.part.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } }),
    workOrderId
      ? prisma.workOrder.findFirst({ where: { id: workOrderId, orgId: session.orgId }, include: { site: true } })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">New purchase request</h1>
      <p className="mb-6 text-sm text-slate-500">
        Request materials or a service you need. If it&apos;s in stock, it&apos;s fulfilled immediately — otherwise
        it goes to your supervisor for approval.
      </p>
      <Card>
        <CardBody>
          <form action={createPurchaseRequest} className="space-y-4">
            {workOrder && <input type="hidden" name="workOrderId" value={workOrder.id} />}
            <Field label="Site" htmlFor="siteId" required>
              <Select id="siteId" name="siteId" required defaultValue={workOrder?.siteId ?? ""}>
                <option value="" disabled>Select site</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="From inventory (optional)" htmlFor="partId">
              <Select id="partId" name="partId" defaultValue="">
                <option value="">Not in inventory / new item</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stockQuantity} in stock)</option>
                ))}
              </Select>
            </Field>
            <Field label="Item / work description" htmlFor="itemName" required>
              <Input id="itemName" name="itemName" required placeholder="e.g. Compressor relay, or 'electrical rewiring service'" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity" htmlFor="quantity" required>
                <Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" required defaultValue="1" />
              </Field>
              <Field label="Unit" htmlFor="unit">
                <Input id="unit" name="unit" placeholder="pcs, liters, job…" />
              </Field>
            </div>
            <Field label="Category" htmlFor="category">
              <Input id="category" name="category" placeholder="e.g. HVAC, Electrical — helps match suppliers" />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={3} />
            </Field>
            <Button type="submit" className="w-full">Submit request</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
