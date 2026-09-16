import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ReportProblemForm } from "@/components/report-problem-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations, getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/request";

export default async function PublicOrgPortalPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const sites = await prisma.site.findMany({
    where: { orgId: org.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const [t, locale] = await Promise.all([getTranslations("requestForm"), getLocale()]);

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-5 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-slate-900">{org.name}</p>
          <p className="text-xs text-slate-500">{t("poweredBy")}</p>
        </div>
        <LanguageSwitcher current={locale as AppLocale} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">{t("reportIssue")}</h2>
        </CardHeader>
        <CardBody>
          <ReportProblemForm orgId={org.id} sites={sites} source="PUBLIC_PORTAL" />
        </CardBody>
      </Card>
    </div>
  );
}
