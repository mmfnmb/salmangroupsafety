import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { assignSupplierToOrder, markOrderSupplied } from "@/server/procurement";
import { format } from "date-fns";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      purchaseRequest: { include: { site: true, part: true, workOrder: true } },
      supplierVendor: true,
    },
  });
  if (!order) notFound();

  const pr = order.purchaseRequest;

  const suggestedVendors = await prisma.vendor.findMany({
    where: {
      status: "APPROVED",
      ...(pr.category ? { categories: { has: pr.category } } : {}),
      coverageCities: { has: pr.site.city },
    },
    orderBy: { name: "asc" },
  });
  // Fall back to category-only match if nothing covers this exact city.
  const fallbackVendors =
    suggestedVendors.length === 0 && pr.category
      ? await prisma.vendor.findMany({ where: { status: "APPROVED", categories: { has: pr.category } }, orderBy: { name: "asc" } })
      : [];
  const vendorOptions = suggestedVendors.length > 0 ? suggestedVendors : fallbackVendors;

  const assignAction = assignSupplierToOrder.bind(null, order.id);
  const suppliedAction = markOrderSupplied.bind(null, order.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{order.orderNumber}</p>
          <h1 className="text-xl font-semibold text-slate-900">{pr.itemName}</h1>
          <p className="text-sm text-slate-500">{pr.site.name} · qty {pr.quantity}{pr.unit ? ` ${pr.unit}` : ""}</p>
        </div>
        <Badge tone={order.status === "SUPPLIED" ? "green" : order.status === "ORDERED" ? "amber" : "slate"}>{order.status}</Badge>
      </div>

      {order.status === "DRAFT" && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Suggested suppliers</h2>
            <p className="mt-1 text-xs text-slate-500">
              Approved vendors matching &quot;{pr.category ?? "any category"}&quot; near {pr.site.city}.
            </p>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {vendorOptions.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.phone ?? "—"} {v.email ? `· ${v.email}` : ""}</p>
                </div>
                <Badge tone="blue">{v.coverageCities.includes(pr.site.city) ? "Covers " + pr.site.city : "Category match"}</Badge>
              </div>
            ))}
            {vendorOptions.length === 0 && (
              <p className="p-5 text-sm text-slate-500">No matching approved vendor yet — enter a supplier manually below.</p>
            )}
          </div>
          <CardBody>
            <form action={assignAction} className="space-y-4">
              {vendorOptions.length > 0 && (
                <Field label="Choose a suggested supplier" htmlFor="supplierVendorId">
                  <Select id="supplierVendorId" name="supplierVendorId" defaultValue="">
                    <option value="">— or enter manually below —</option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.phone})</option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Supplier name (if not listed)" htmlFor="supplierNameFreeText">
                  <Input id="supplierNameFreeText" name="supplierNameFreeText" />
                </Field>
                <Field label="Contact" htmlFor="supplierContact">
                  <Input id="supplierContact" name="supplierContact" placeholder="Phone / email" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unit cost (SAR)" htmlFor="unitCostSar">
                  <Input id="unitCostSar" name="unitCostSar" type="number" step="0.01" />
                </Field>
                <Field label="Total cost (SAR)" htmlFor="totalCostSar">
                  <Input id="totalCostSar" name="totalCostSar" type="number" step="0.01" />
                </Field>
              </div>
              <Button type="submit" className="w-full">Confirm order</Button>
            </form>
          </CardBody>
        </Card>
      )}

      {order.status !== "DRAFT" && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-900">Order</h2></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-700">
            <p><strong>Supplier:</strong> {order.supplierVendor?.name ?? order.supplierNameFreeText ?? "—"} {order.supplierContact ? `(${order.supplierContact})` : ""}</p>
            {order.totalCostSar != null && <p><strong>Total cost:</strong> SAR {Number(order.totalCostSar).toLocaleString()}</p>}
            <p><strong>Ordered:</strong> {order.orderedAt ? format(order.orderedAt, "dd MMM yyyy, HH:mm") : "—"}</p>
            {order.suppliedAt && <p><strong>Supplied:</strong> {format(order.suppliedAt, "dd MMM yyyy, HH:mm")}</p>}
          </CardBody>
          {order.status === "ORDERED" && (
            <CardBody className="border-t border-slate-100">
              <form action={suppliedAction}>
                <Button type="submit">Mark as supplied — close request</Button>
              </form>
            </CardBody>
          )}
          {order.status === "SUPPLIED" && pr.part && (
            <CardBody className="border-t border-slate-100 text-xs text-slate-500">
              Inventory restocked: +{pr.quantity} {pr.part.name}.
            </CardBody>
          )}
        </Card>
      )}
    </div>
  );
}
