import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button, LinkButton } from "@/components/ui/button";
import { createBuilding } from "@/server/sites";
import { notFound } from "next/navigation";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();
  const site = await prisma.site.findFirst({
    where: { id, orgId: session.orgId },
    include: { buildings: { include: { _count: { select: { assets: true } } } }, _count: { select: { assets: true } } },
  });
  if (!site) notFound();

  const createBuildingForSite = createBuilding.bind(null, site.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {site.name} <span className="text-sm font-normal text-slate-400">({site.code})</span>
          </h1>
          <p className="text-sm text-slate-500">{site.city} · {site._count.assets} assets</p>
        </div>
        <LinkButton href={`/app/assets?siteId=${site.id}`} variant="secondary">
          View assets
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Buildings</h2>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {site.buildings.length === 0 && (
                <p className="p-5 text-sm text-slate-500">No buildings yet.</p>
              )}
              {site.buildings.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-500">{b._count.assets} assets</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Add building</h2>
            </CardHeader>
            <CardBody>
              <form action={createBuildingForSite} className="space-y-4">
                <Field label="Name (English)" htmlFor="name" required>
                  <Input id="name" name="name" required />
                </Field>
                <Field label="Name (Arabic)" htmlFor="nameAr">
                  <Input id="nameAr" name="nameAr" dir="rtl" />
                </Field>
                <Button type="submit" className="w-full">
                  Add building
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
