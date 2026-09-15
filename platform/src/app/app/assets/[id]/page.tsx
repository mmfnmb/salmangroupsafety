import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetQrDataUri } from "@/lib/qr";
import { computeAssetHealthScore, healthBand } from "@/lib/scoring";
import { canViewFinancials } from "@/lib/roles";
import { format } from "date-fns";
import Link from "next/link";

function fmtDate(d: Date | null) {
  return d ? format(d, "dd MMM yyyy") : "—";
}
function fmtSar(v: unknown) {
  return v != null ? `SAR ${Number(v).toLocaleString()}` : "—";
}

export default async function AssetPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const asset = await prisma.asset.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      site: true,
      building: true,
      floor: true,
      room: true,
      systemType: true,
      documents: true,
      pmPlans: true,
      workOrders: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!asset) notFound();

  const [qrDataUri, health] = await Promise.all([
    assetQrDataUri(asset.qrToken),
    computeAssetHealthScore(asset.id),
  ]);
  const band = healthBand(health.overallScore);
  const showFinancials = canViewFinancials(session.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{asset.assetCode}</p>
          <h1 className="text-xl font-semibold text-slate-900">{asset.name}</h1>
          <p className="text-sm text-slate-500">
            {asset.site.name}
            {asset.building ? ` · ${asset.building.name}` : ""}
            {asset.floor ? ` · ${asset.floor.name}` : ""}
            {asset.room ? ` · ${asset.room.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="blue">{asset.status.replace("_", " ")}</Badge>
          <Badge tone="amber">{asset.criticality} criticality</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Identification</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Info label="System" value={asset.systemType?.nameEn ?? "—"} />
              <Info label="Type" value={asset.type ?? "—"} />
              <Info label="Manufacturer" value={asset.manufacturer ?? "—"} />
              <Info label="Brand" value={asset.brand ?? "—"} />
              <Info label="Model" value={asset.model ?? "—"} />
              <Info label="Serial number" value={asset.serialNumber ?? "—"} />
              <Info label="Condition" value={asset.condition} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Lifecycle & warranty</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Info label="Purchase date" value={fmtDate(asset.purchaseDate)} />
              <Info label="Installation date" value={fmtDate(asset.installationDate)} />
              <Info label="Commissioning date" value={fmtDate(asset.commissioningDate)} />
              <Info label="Useful life" value={asset.usefulLifeYears ? `${asset.usefulLifeYears} years` : "—"} />
              <Info label="Warranty start" value={fmtDate(asset.warrantyStart)} />
              <Info
                label="Warranty end"
                value={fmtDate(asset.warrantyEnd)}
                warn={!!asset.warrantyEnd && asset.warrantyEnd > new Date()}
              />
              <Info label="Warranty provider" value={asset.warrantyProvider ?? "—"} />
              {showFinancials && (
                <>
                  <Info label="Purchase price" value={fmtSar(asset.purchasePriceSar)} />
                  <Info label="Installation cost" value={fmtSar(asset.installationCostSar)} />
                  <Info label="Replacement cost" value={fmtSar(asset.replacementCostSar)} />
                  <Info label="Supplier" value={asset.supplierName ?? "—"} />
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Maintenance history</h2>
              <Link href={`/app/work-orders?assetId=${asset.id}`} className="text-xs text-blue-700">
                View all
              </Link>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {asset.workOrders.length === 0 && (
                <p className="p-5 text-sm text-slate-500">No work orders recorded for this asset yet.</p>
              )}
              {asset.workOrders.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/app/work-orders/${wo.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-mono text-xs text-slate-500">{wo.number}</p>
                    <p className="text-sm text-slate-800">{wo.description}</p>
                  </div>
                  <Badge tone="slate">{wo.status.replace("_", " ")}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-col items-center gap-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUri} alt="Asset QR code" width={160} height={160} />
              <p className="text-xs text-slate-500">Scan to open the field passport / report a problem.</p>
              <Link
                href={`/qr/${asset.qrToken}`}
                target="_blank"
                className="text-xs font-medium text-blue-700 underline"
              >
                Open public view
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Asset Health Score</h2>
            </CardHeader>
            <CardBody>
              <p className={`text-4xl font-bold ${band.color}`}>{health.overallScore}</p>
              <p className={`text-sm font-medium ${band.color}`}>{band.label}</p>
              <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
                <ScoreRow label="Condition" value={health.conditionScore} />
                <ScoreRow label="PM compliance" value={Math.round(health.pmComplianceScore)} />
                <ScoreRow label="Breakdown history" value={health.breakdownScore} />
                <ScoreRow label="Open defects" value={health.openDefectScore} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Preventive maintenance</h2>
            </CardHeader>
            <CardBody>
              {asset.pmPlans.length === 0 ? (
                <p className="text-sm text-slate-500">No PM plan configured.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {asset.pmPlans.map((p) => (
                    <li key={p.id}>{p.name} — {p.frequency}</li>
                  ))}
                </ul>
              )}
              <Link href={`/app/pm/new?assetId=${asset.id}`} className="mt-3 inline-block text-xs text-blue-700">
                + Add PM plan
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={warn ? "font-medium text-amber-600" : "text-slate-800"}>{value}</dd>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
