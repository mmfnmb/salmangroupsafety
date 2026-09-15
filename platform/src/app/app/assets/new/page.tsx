import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { AssetLocationPicker } from "@/components/asset-location-picker";
import { createAsset } from "@/server/assets";
import { redirect } from "next/navigation";

export default async function NewAssetPage() {
  const session = await requireOrgSession();

  const [sites, systemTypes] = await Promise.all([
    prisma.site.findMany({
      where: { orgId: session.orgId },
      include: { buildings: { include: { floors: { include: { rooms: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.assetSystemType.findMany({
      where: { OR: [{ orgId: session.orgId }, { orgId: null }] },
      orderBy: { nameEn: "asc" },
    }),
  ]);

  if (sites.length === 0) {
    redirect("/app/sites");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Register asset</h1>

      <form action={createAsset} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Location</h2>
          </CardHeader>
          <CardBody>
            <AssetLocationPicker sites={sites} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Identification</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset name (English)" htmlFor="name" required>
                <Input id="name" name="name" required />
              </Field>
              <Field label="Asset name (Arabic)" htmlFor="nameAr">
                <Input id="nameAr" name="nameAr" dir="rtl" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="System" htmlFor="systemTypeId">
                <Select id="systemTypeId" name="systemTypeId">
                  <option value="">—</option>
                  {systemTypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type" htmlFor="type">
                <Input id="type" name="type" placeholder="e.g. Split AC" />
              </Field>
              <Field label="Asset code (leave blank to auto-generate)" htmlFor="assetCode">
                <Input id="assetCode" name="assetCode" className="font-mono" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Manufacturer" htmlFor="manufacturer">
                <Input id="manufacturer" name="manufacturer" />
              </Field>
              <Field label="Brand" htmlFor="brand">
                <Input id="brand" name="brand" />
              </Field>
              <Field label="Model" htmlFor="model">
                <Input id="model" name="model" />
              </Field>
            </div>
            <Field label="Serial number" htmlFor="serialNumber">
              <Input id="serialNumber" name="serialNumber" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Status & lifecycle</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue="OPERATIONAL">
                  <option value="OPERATIONAL">Operational</option>
                  <option value="DOWN">Down</option>
                  <option value="UNDER_MAINTENANCE">Under maintenance</option>
                  <option value="DECOMMISSIONED">Decommissioned</option>
                </Select>
              </Field>
              <Field label="Criticality" htmlFor="criticality">
                <Select id="criticality" name="criticality" defaultValue="MEDIUM">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </Field>
              <Field label="Condition" htmlFor="condition">
                <Select id="condition" name="condition" defaultValue="GOOD">
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </Field>
            </div>
            <Field label="Expected useful life (years)" htmlFor="usefulLifeYears">
              <Input id="usefulLifeYears" name="usefulLifeYears" type="number" min="1" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Commercial & warranty</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Supplier" htmlFor="supplierName">
                <Input id="supplierName" name="supplierName" />
              </Field>
              <Field label="Warranty provider" htmlFor="warrantyProvider">
                <Input id="warrantyProvider" name="warrantyProvider" />
              </Field>
              <Field label="Purchase price (SAR)" htmlFor="purchasePriceSar">
                <Input id="purchasePriceSar" name="purchasePriceSar" type="number" step="0.01" />
              </Field>
              <Field label="Installation cost (SAR)" htmlFor="installationCostSar">
                <Input id="installationCostSar" name="installationCostSar" type="number" step="0.01" />
              </Field>
              <Field label="Replacement cost (SAR)" htmlFor="replacementCostSar">
                <Input id="replacementCostSar" name="replacementCostSar" type="number" step="0.01" />
              </Field>
              <Field label="Purchase date" htmlFor="purchaseDate">
                <Input id="purchaseDate" name="purchaseDate" type="date" />
              </Field>
              <Field label="Installation date" htmlFor="installationDate">
                <Input id="installationDate" name="installationDate" type="date" />
              </Field>
              <Field label="Commissioning date" htmlFor="commissioningDate">
                <Input id="commissioningDate" name="commissioningDate" type="date" />
              </Field>
              <Field label="Warranty start" htmlFor="warrantyStart">
                <Input id="warrantyStart" name="warrantyStart" type="date" />
              </Field>
              <Field label="Warranty end" htmlFor="warrantyEnd">
                <Input id="warrantyEnd" name="warrantyEnd" type="date" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit">Register asset</Button>
        </div>
      </form>
    </div>
  );
}
