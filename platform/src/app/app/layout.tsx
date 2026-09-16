import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getLiveAlerts } from "@/lib/notify";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { signOutAction } from "@/server/auth-actions";
import type { AppLocale } from "@/i18n/request";

function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrgSession();
  const [t, locale, org, user, notifications, liveAlerts] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    prisma.organization.findUnique({ where: { id: session.orgId }, select: { name: true, nameAr: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, nameAr: true } }),
    prisma.notification.findMany({
      where: { orgId: session.orgId, userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getLiveAlerts(session.orgId),
  ]);

  const orgName = locale === "ar" ? org?.nameAr || org?.name : org?.name;
  const userName = (locale === "ar" ? user?.nameAr || user?.name : user?.name) ?? "User";
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar t={{
        dashboard: t("dashboard"), assets: t("assets"), sites: t("sites"), requests: t("requests"),
        workOrders: t("workOrders"), pm: t("pm"), checklists: t("checklists"), technicians: t("technicians"), vendors: t("vendors"),
        rfq: t("rfq"), inventory: t("inventory"), procurement: t("procurement"), aiAssistant: t("aiAssistant"), contracts: t("contracts"), reports: t("reports"), settings: t("settings"), logout: t("logout"),
      }} role={session.role} orgName={orgName ?? ""} onSignOut={signOutAction} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <Suspense fallback={<div className="w-full max-w-sm" />}>
            <GlobalSearch />
          </Suspense>
          <div className="flex items-center gap-2">
            <NotificationBell
              persisted={notifications.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                isRead: n.isRead,
                createdAt: n.createdAt.toISOString(),
              }))}
              live={liveAlerts}
              unreadCount={unreadCount}
            />
            <LanguageSwitcher current={locale as AppLocale} />
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <UserMenu name={userName} roleLabel={roleLabel(session.role)} onSignOut={signOutAction} />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
