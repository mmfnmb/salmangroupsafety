import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/client";

type NavLabels = {
  dashboard: string;
  assets: string;
  sites: string;
  requests: string;
  workOrders: string;
  pm: string;
  technicians: string;
  vendors: string;
  contracts: string;
  reports: string;
  settings: string;
  logout: string;
};

const EXEC_ONLY: UserRole[] = ["ACCOUNT_OWNER"];

export function AppSidebar({ t, role, orgName }: { t: NavLabels; role: UserRole; orgName: string }) {
  const items = [
    { href: "/app", label: t.dashboard },
    { href: "/app/sites", label: t.sites },
    { href: "/app/assets", label: t.assets },
    { href: "/app/requests", label: t.requests },
    { href: "/app/work-orders", label: t.workOrders },
    { href: "/app/pm", label: t.pm },
    { href: "/app/technicians", label: t.technicians },
    { href: "/app/vendors", label: t.vendors },
    { href: "/app/contracts", label: t.contracts },
    { href: "/app/reports", label: t.reports },
  ];

  const isExec = EXEC_ONLY.includes(role);

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-e border-slate-200 bg-slate-950 text-slate-200">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-bold text-white">Maintain360</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{orgName}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
        {isExec && (
          <Link
            href="/app/executive"
            className="block px-5 py-2 text-sm font-medium text-blue-300 hover:bg-white/5 hover:text-white"
          >
            Executive Command Center
          </Link>
        )}
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="border-t border-white/10 p-3"
      >
        <button className="block w-full rounded-md px-2 py-2 text-start text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          {t.logout}
        </button>
      </form>
    </aside>
  );
}
