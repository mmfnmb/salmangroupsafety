import { getTranslations, getLocale } from "next-intl/server";
import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppLocale } from "@/i18n/request";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrgSession();
  const [t, locale, org] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    prisma.organization.findUnique({ where: { id: session.orgId }, select: { name: true, nameAr: true } }),
  ]);

  const orgName = locale === "ar" ? org?.nameAr || org?.name : org?.name;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar t={{
        dashboard: t("dashboard"), assets: t("assets"), sites: t("sites"), requests: t("requests"),
        workOrders: t("workOrders"), pm: t("pm"), technicians: t("technicians"), vendors: t("vendors"),
        rfq: t("rfq"), inventory: t("inventory"), procurement: t("procurement"), aiAssistant: t("aiAssistant"), contracts: t("contracts"), reports: t("reports"), settings: t("settings"), logout: t("logout"),
      }} role={session.role} orgName={orgName ?? ""} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <LanguageSwitcher current={locale as AppLocale} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
