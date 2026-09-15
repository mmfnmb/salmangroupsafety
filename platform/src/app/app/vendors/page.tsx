import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function VendorsPage() {
  await requireOrgSession();
  const vendors = await prisma.vendor.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendor Directory</h1>
        <p className="text-sm text-slate-500">
          Approved maintenance contractors available on the platform. RFQ and managed procurement (Phase 2–3) will
          let you invite vendors to quote directly from here.
        </p>
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              No approved vendors yet in the Eastern Province network. Vendor onboarding is coming in the next
              platform phase.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <Card key={v.id} className="p-4">
              <p className="text-sm font-medium text-slate-900">{v.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {v.categories.map((c) => (
                  <Badge key={c} tone="blue">{c}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{v.coverageCities.join(", ")}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
