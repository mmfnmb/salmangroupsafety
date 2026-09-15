import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportProblemForm } from "@/components/report-problem-form";
import Link from "next/link";

export default async function AssetQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const asset = await prisma.asset.findUnique({
    where: { qrToken: token },
    include: { site: true, building: true, floor: true, room: true, systemType: true },
  });
  if (!asset) notFound();

  const session = await auth();
  const isInternal = session?.user?.accountType === "customer" && session.user.orgId === asset.orgId;

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-5 bg-slate-50 p-5">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">Maintain360</p>
        <p className="text-xs text-slate-500">Asset Field Passport</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-slate-400">{asset.assetCode}</p>
            <h1 className="text-base font-semibold text-slate-900">{asset.name}</h1>
          </div>
          <Badge tone={asset.status === "OPERATIONAL" ? "green" : asset.status === "DOWN" ? "red" : "amber"}>
            {asset.status.replace("_", " ")}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-1 text-sm text-slate-600">
          <p>
            {asset.site.name}
            {asset.building ? ` · ${asset.building.name}` : ""}
            {asset.floor ? ` · ${asset.floor.name}` : ""}
            {asset.room ? ` · ${asset.room.name}` : ""}
          </p>
          {asset.systemType && <p>System: {asset.systemType.nameEn}</p>}
          {isInternal && (
            <>
              {asset.manufacturer && <p>Manufacturer: {asset.manufacturer}</p>}
              {asset.model && <p>Model: {asset.model}</p>}
              {asset.serialNumber && <p>Serial: {asset.serialNumber}</p>}
              <Link href={`/app/assets/${asset.id}`} className="mt-2 inline-block text-xs font-medium text-blue-700">
                Open full asset passport →
              </Link>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Report a problem</h2>
        </CardHeader>
        <CardBody>
          <ReportProblemForm orgId={asset.orgId} assetId={asset.id} siteId={asset.siteId} source="QR_SCAN" />
        </CardBody>
      </Card>
    </div>
  );
}
