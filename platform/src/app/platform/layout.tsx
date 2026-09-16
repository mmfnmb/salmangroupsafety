import { requirePlatformSession } from "@/lib/tenant";
import { signOut } from "@/lib/auth";
import Link from "next/link";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformSession();

  const items = [
    { href: "/platform", label: "Overview" },
    { href: "/platform/vendors", label: "Vendors" },
    { href: "/platform/customers", label: "Customers" },
    { href: "/platform/leads", label: "Leads" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-shrink-0 flex-col border-e border-slate-200 bg-slate-950 text-slate-200">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-sm font-bold text-white">Maintain360</p>
          <p className="mt-0.5 text-xs text-slate-400">Platform Admin</p>
        </div>
        <nav className="flex-1 space-y-0.5 py-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block px-5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="border-t border-white/10 p-3"
        >
          <button className="block w-full rounded-md px-2 py-2 text-start text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            Log out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
