import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPart, restockPart } from "@/server/inventory";

export default async function InventoryPage() {
  const session = await requireOrgSession();
  const parts = await prisma.part.findMany({
    where: { orgId: session.orgId },
    orderBy: { name: "asc" },
  });

  const lowStockCount = parts.filter((p) => p.stockQuantity <= p.minStockQuantity).length;
  const canManage = canManageOrg(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Spare Parts Inventory</h1>
        <p className="text-sm text-slate-500">
          {parts.length} parts tracked{lowStockCount > 0 ? ` · ${lowStockCount} at or below minimum stock` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-start">Part</th>
                  <th className="px-4 py-2 text-start">Part #</th>
                  <th className="px-4 py-2 text-start">Store</th>
                  <th className="px-4 py-2 text-start">Stock</th>
                  <th className="px-4 py-2 text-start">Min</th>
                  <th className="px-4 py-2 text-start">Unit cost</th>
                  {canManage && <th className="px-4 py-2 text-start">Restock</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((p) => {
                  const low = p.stockQuantity <= p.minStockQuantity;
                  const restockAction = restockPart.bind(null, p.id);
                  return (
                    <tr key={p.id} className={low ? "bg-red-50/60" : ""}>
                      <td className="px-4 py-2.5 text-slate-800">
                        {p.name}
                        {p.brand && <span className="text-xs text-slate-400"> · {p.brand}</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.partNumber ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.store ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {low ? <Badge tone="red">{p.stockQuantity} low</Badge> : <span>{p.stockQuantity}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{p.minStockQuantity}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {p.unitCostSar ? `SAR ${Number(p.unitCostSar).toLocaleString()}` : "—"}
                      </td>
                      {canManage && (
                        <td className="px-4 py-2.5">
                          <form action={restockAction} className="flex gap-1">
                            <Input name="addQuantity" type="number" min="1" placeholder="+qty" className="w-20 px-2 py-1" />
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Add</Button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {parts.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No parts in inventory yet.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {canManage && (
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-slate-900">Add part</h2></CardHeader>
            <CardBody>
              <form action={createPart} className="space-y-4">
                <Field label="Part name" htmlFor="name" required>
                  <Input id="name" name="name" required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Part number" htmlFor="partNumber">
                    <Input id="partNumber" name="partNumber" />
                  </Field>
                  <Field label="Brand" htmlFor="brand">
                    <Input id="brand" name="brand" />
                  </Field>
                </div>
                <Field label="Supplier" htmlFor="supplierName">
                  <Input id="supplierName" name="supplierName" />
                </Field>
                <Field label="Store / location" htmlFor="store">
                  <Input id="store" name="store" placeholder="e.g. Main store, Rack A3" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Initial stock" htmlFor="stockQuantity">
                    <Input id="stockQuantity" name="stockQuantity" type="number" min="0" defaultValue="0" />
                  </Field>
                  <Field label="Minimum stock" htmlFor="minStockQuantity">
                    <Input id="minStockQuantity" name="minStockQuantity" type="number" min="0" defaultValue="0" />
                  </Field>
                </div>
                <Field label="Unit cost (SAR)" htmlFor="unitCostSar">
                  <Input id="unitCostSar" name="unitCostSar" type="number" step="0.01" />
                </Field>
                <Field label="Compatible with" htmlFor="compatibleWith">
                  <Input id="compatibleWith" name="compatibleWith" placeholder="e.g. Split AC units, HVAC" />
                </Field>
                <Button type="submit" className="w-full">Add part</Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
