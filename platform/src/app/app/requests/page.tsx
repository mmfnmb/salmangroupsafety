import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { convertRequestToWorkOrder, rejectRequest } from "@/server/requests";
import { AiTriageButton } from "@/components/ai-triage-button";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

const PRIORITY_TONE = {
  LOW: "slate",
  NORMAL: "blue",
  HIGH: "amber",
  EMERGENCY: "red",
  CRITICAL: "red",
} as const;

export default async function RequestsPage() {
  const session = await requireOrgSession();
  const [requests, t, tc, tp, ts, tsrc] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where: { orgId: session.orgId },
      include: { site: true, asset: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getTranslations("requestsPage"),
    getTranslations("common"),
    getTranslations("priority"),
    getTranslations("requestStatus"),
    getTranslations("requestSource"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <LinkButton href="/app/requests/new">{t("logRequest")}</LinkButton>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-start">{t("colReference")}</th>
              <th className="px-4 py-2 text-start">{t("colDescription")}</th>
              <th className="px-4 py-2 text-start">{t("colSiteAsset")}</th>
              <th className="px-4 py-2 text-start">{tc("priority")}</th>
              <th className="px-4 py-2 text-start">{t("colSource")}</th>
              <th className="px-4 py-2 text-start">{tc("status")}</th>
              <th className="px-4 py-2 text-start">{t("colReceived")}</th>
              <th className="px-4 py-2 text-start">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => {
              const convert = convertRequestToWorkOrder.bind(null, r.id);
              const reject = rejectRequest.bind(null, r.id);
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <Link href={`/app/requests/${r.id}`} className="text-blue-700 hover:underline">
                      {r.referenceNumber}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-800">{r.description}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.site.name}
                    {r.asset ? ` · ${r.asset.assetCode}` : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={PRIORITY_TONE[r.priority]}>{tp(r.priority)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{tsrc(r.source)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={r.status === "NEW" ? "amber" : r.status === "CONVERTED" ? "green" : "slate"}>
                      {ts(r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{format(r.createdAt, "dd MMM, HH:mm")}</td>
                  <td className="px-4 py-2.5">
                    {r.status === "NEW" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <form action={convert}>
                            <Button type="submit" variant="primary" className="px-2 py-1 text-xs">
                              {t("convertToWo")}
                            </Button>
                          </form>
                          <Link
                            href={`/app/rfq/new?requestId=${r.id}`}
                            className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {t("sendToVendors")}
                          </Link>
                          <form action={reject}>
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                              {t("reject")}
                            </Button>
                          </form>
                        </div>
                        <AiTriageButton requestId={r.id} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  {t("noRequests")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
