import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateDuePM } from "@/server/pm";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";

export default async function PMPage() {
  const session = await requireOrgSession();

  const [plans, t, tc, tf] = await Promise.all([
    prisma.pMPlan.findMany({
      where: { orgId: session.orgId },
      include: {
        asset: true,
        assignedTechnician: true,
        schedules: { where: { status: { in: ["UPCOMING", "DUE", "OVERDUE"] } }, orderBy: { dueDate: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("pmPage"),
    getTranslations("common"),
    getTranslations("pmFrequency"),
  ]);

  const completedSchedules = await prisma.pMSchedule.count({
    where: { pmPlan: { orgId: session.orgId }, status: "COMPLETED" },
  });
  const totalPastDue = await prisma.pMSchedule.count({
    where: { pmPlan: { orgId: session.orgId }, status: { in: ["COMPLETED", "OVERDUE"] } },
  });
  const compliance = totalPastDue > 0 ? Math.round((completedSchedules / totalPastDue) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("compliance", { percent: compliance })}</p>
        </div>
        <div className="flex gap-2">
          {canManageOrg(session.role) && (
            <form
              action={async () => {
                "use server";
                await generateDuePM();
              }}
            >
              <Button type="submit" variant="secondary">
                {t("generateDue")}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">{t("colPlan")}</th>
              <th className="px-4 py-2 text-start">{t("colAsset")}</th>
              <th className="px-4 py-2 text-start">{t("colFrequency")}</th>
              <th className="px-4 py-2 text-start">{t("colTechnician")}</th>
              <th className="px-4 py-2 text-start">{t("colNextDue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => {
              const next = p.schedules[0];
              const overdue = next && next.dueDate < new Date();
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.asset.assetCode}</td>
                  <td className="px-4 py-2.5 text-slate-600">{tf(p.frequency)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.assignedTechnician?.name ?? tc("unassigned")}</td>
                  <td className="px-4 py-2.5">
                    {next ? (
                      <Badge tone={overdue ? "red" : "blue"}>{format(next.dueDate, "dd MMM yyyy")}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("noPlans")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
