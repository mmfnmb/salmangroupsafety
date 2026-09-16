import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function PlatformLeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Sales Leads</h1>
      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">Type</th>
              <th className="px-4 py-2 text-start">Name / Company</th>
              <th className="px-4 py-2 text-start">Contact</th>
              <th className="px-4 py-2 text-start">City</th>
              <th className="px-4 py-2 text-start">Note</th>
              <th className="px-4 py-2 text-start">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5"><Badge tone={l.type === "VENDOR" ? "purple" : "blue"}>{l.type}</Badge></td>
                <td className="px-4 py-2.5 text-slate-800">{l.name}{l.company ? ` — ${l.company}` : ""}</td>
                <td className="px-4 py-2.5 text-slate-600">{l.phone}{l.email ? ` · ${l.email}` : ""}</td>
                <td className="px-4 py-2.5 text-slate-600">{l.city ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-2.5 text-slate-600">{l.mainProblem ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{format(l.createdAt, "dd MMM, HH:mm")}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
