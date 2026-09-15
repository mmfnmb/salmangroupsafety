import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ReportProblemForm } from "@/components/report-problem-form";

export default async function PublicOrgPortalPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const sites = await prisma.site.findMany({
    where: { orgId: org.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-5 bg-slate-50 p-5">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">{org.name}</p>
        <p className="text-xs text-slate-500">Maintenance Request Portal — powered by Maintain360</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Report a maintenance issue</h2>
        </CardHeader>
        <CardBody>
          <ReportProblemForm orgId={org.id} sites={sites} source="PUBLIC_PORTAL" />
        </CardBody>
      </Card>
    </div>
  );
}
