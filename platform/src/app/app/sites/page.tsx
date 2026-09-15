import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSite } from "@/server/sites";
import Link from "next/link";

export default async function SitesPage() {
  const session = await requireOrgSession();
  const sites = await prisma.site.findMany({
    where: { orgId: session.orgId },
    include: { _count: { select: { assets: true, buildings: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sites</h1>
          <p className="text-sm text-slate-500">Projects and facilities in your portfolio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="divide-y divide-slate-100">
              {sites.length === 0 && <p className="p-5 text-sm text-slate-500">No sites yet. Add your first site.</p>}
              {sites.map((site) => (
                <Link
                  key={site.id}
                  href={`/app/sites/${site.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {site.name} <span className="text-xs text-slate-400">({site.code})</span>
                    </p>
                    <p className="text-xs text-slate-500">{site.city}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="blue">{site._count.buildings} buildings</Badge>
                    <Badge tone="slate">{site._count.assets} assets</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Add site</h2>
            </CardHeader>
            <CardBody>
              <form action={createSite} className="space-y-4">
                <Field label="Site code" htmlFor="code" required>
                  <Input id="code" name="code" placeholder="DAM01" required />
                </Field>
                <Field label="Name (English)" htmlFor="name" required>
                  <Input id="name" name="name" required />
                </Field>
                <Field label="Name (Arabic)" htmlFor="nameAr">
                  <Input id="nameAr" name="nameAr" dir="rtl" />
                </Field>
                <Field label="City" htmlFor="city" required>
                  <Input id="city" name="city" placeholder="Dammam" required />
                </Field>
                <Field label="Address" htmlFor="address">
                  <Input id="address" name="address" />
                </Field>
                <Button type="submit" className="w-full">
                  Create site
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
