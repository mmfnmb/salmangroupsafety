"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  CalendarCheck2,
  ListChecks,
  Boxes,
  Building2,
  Users,
  ShieldCheck,
  FileSearch,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  FileBarChart2,
  FileSignature,
  Settings,
  LogOut,
  Crown,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";

type NavLabels = {
  dashboard: string;
  assets: string;
  sites: string;
  requests: string;
  workOrders: string;
  pm: string;
  checklists: string;
  technicians: string;
  vendors: string;
  rfq: string;
  inventory: string;
  procurement: string;
  aiAssistant: string;
  contracts: string;
  reports: string;
  settings: string;
  logout: string;
};

const EXEC_ONLY: UserRole[] = ["ACCOUNT_OWNER"];

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title?: string; items: NavItem[] };

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({
  t,
  role,
  orgName,
  onSignOut,
}: {
  t: NavLabels;
  role: UserRole;
  orgName: string;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const isExec = EXEC_ONLY.includes(role);

  const groups: NavGroup[] = [
    { items: [{ href: "/app", label: t.dashboard, icon: LayoutDashboard }] },
    {
      title: "Operations",
      items: [
        { href: "/app/requests", label: t.requests, icon: ClipboardList },
        { href: "/app/work-orders", label: t.workOrders, icon: Wrench },
        { href: "/app/pm", label: t.pm, icon: CalendarCheck2 },
        { href: "/app/checklists", label: t.checklists, icon: ListChecks },
      ],
    },
    {
      title: "Assets",
      items: [
        { href: "/app/assets", label: t.assets, icon: Boxes },
        { href: "/app/sites", label: t.sites, icon: Building2 },
      ],
    },
    {
      title: "Workforce",
      items: [
        { href: "/app/technicians", label: t.technicians, icon: Users },
        { href: "/app/vendors", label: t.vendors, icon: ShieldCheck },
      ],
    },
    {
      title: "Procurement",
      items: [
        { href: "/app/rfq", label: t.rfq, icon: FileSearch },
        { href: "/app/inventory", label: t.inventory, icon: PackageSearch },
        { href: "/app/procurement", label: t.procurement, icon: ShoppingCart },
      ],
    },
    {
      title: "Intelligence",
      items: [
        { href: "/app/ai-assistant", label: t.aiAssistant, icon: Sparkles },
        { href: "/app/reports", label: t.reports, icon: FileBarChart2 },
        { href: "/app/contracts", label: t.contracts, icon: FileSignature },
      ],
    },
    {
      title: "Admin",
      items: [{ href: "/app/settings", label: t.settings, icon: Settings }],
    },
  ];

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-e border-white/5 bg-slate-950 text-slate-200">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-bold tracking-tight text-white">Maintain360</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{orgName}</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group, i) => (
          <div key={group.title ?? `g${i}`}>
            {group.title && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600/15 text-white ring-1 ring-inset ring-blue-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon size={17} className={active ? "text-blue-400" : "text-slate-500"} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isExec && (
          <div>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Executive</p>
            <Link
              href="/app/executive"
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                isActive(pathname, "/app/executive")
                  ? "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-500/30"
                  : "text-amber-300/90 hover:bg-white/5 hover:text-amber-200"
              )}
            >
              <Crown size={17} className="text-amber-400" />
              <span className="truncate">Executive Command Center</span>
            </Link>
          </div>
        )}
      </nav>
      <form action={onSignOut} className="border-t border-white/10 p-3">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
          <LogOut size={17} />
          {t.logout}
        </button>
      </form>
    </aside>
  );
}
