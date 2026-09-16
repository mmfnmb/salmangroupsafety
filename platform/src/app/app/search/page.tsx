import Link from "next/link";
import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Boxes, ClipboardList, Wrench, Building2, ShieldCheck } from "lucide-react";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireOrgSession();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Search</h1>
        <p className="text-sm text-slate-500">Type in the search box above to find assets, requests, work orders, sites and vendors.</p>
      </div>
    );
  }

  const [assets, requests, workOrders, sites, vendors] = await Promise.all([
    prisma.asset.findMany({
      where: { orgId: session.orgId, OR: [{ name: { contains: query, mode: "insensitive" } }, { assetCode: { contains: query, mode: "insensitive" } }] },
      take: 10,
    }),
    prisma.maintenanceRequest.findMany({
      where: { orgId: session.orgId, OR: [{ referenceNumber: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] },
      take: 10,
    }),
    prisma.workOrder.findMany({
      where: { orgId: session.orgId, OR: [{ number: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] },
      take: 10,
    }),
    prisma.site.findMany({
      where: { orgId: session.orgId, name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    prisma.vendor.findMany({
      where: { status: "APPROVED", name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
  ]);

  const sections = [
    { title: "Assets", icon: Boxes, items: assets.map((a) => ({ href: `/app/assets/${a.id}`, primary: a.name, secondary: a.assetCode })) },
    { title: "Requests", icon: ClipboardList, items: requests.map((r) => ({ href: `/app/requests/${r.id}`, primary: r.referenceNumber, secondary: r.description })) },
    { title: "Work Orders", icon: Wrench, items: workOrders.map((w) => ({ href: `/app/work-orders/${w.id}`, primary: w.number, secondary: w.description })) },
    { title: "Sites", icon: Building2, items: sites.map((s) => ({ href: `/app/sites/${s.id}`, primary: s.name, secondary: s.city ?? "" })) },
    { title: "Vendors", icon: ShieldCheck, items: vendors.map((v) => ({ href: `/app/vendors`, primary: v.name, secondary: v.categories.join(", ") })) },
  ];

  const totalResults = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Search results for &ldquo;{query}&rdquo; <span className="text-sm font-normal text-slate-500">({totalResults})</span>
      </h1>

      {totalResults === 0 && <p className="text-sm text-slate-500">No matches found.</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sections.filter((s) => s.items.length > 0).map((section) => (
          <Card key={section.title}>
            <CardHeader className="flex items-center gap-2">
              <section.icon size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
            </CardHeader>
            <CardBody className="space-y-1 p-2">
              {section.items.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">{item.primary}</p>
                  {item.secondary && <p className="truncate text-xs text-slate-500">{item.secondary}</p>}
                </Link>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
