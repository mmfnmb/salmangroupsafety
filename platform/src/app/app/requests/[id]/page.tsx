import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiTriageButton } from "@/components/ai-triage-button";
import { convertRequestToWorkOrder, rejectRequest } from "@/server/requests";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";

const PRIORITY_TONE = {
  LOW: "slate",
  NORMAL: "blue",
  HIGH: "amber",
  EMERGENCY: "red",
  CRITICAL: "red",
} as const;

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOrgSession();

  const [request, t, tc, tp, ts, tsrc, tw] = await Promise.all([
    prisma.maintenanceRequest.findFirst({
      where: { id, orgId: session.orgId },
      include: { site: true, asset: true, requesterUser: true, workOrder: true, rfq: true },
    }),
    getTranslations("requestDetail"),
    getTranslations("common"),
    getTranslations("priority"),
    getTranslations("requestStatus"),
    getTranslations("requestSource"),
    getTranslations("workOrderStatus"),
  ]);
  if (!request) notFound();

  const convert = convertRequestToWorkOrder.bind(null, request.id);
  const reject = rejectRequest.bind(null, request.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-400">{request.referenceNumber}</p>
          <h1 className="text-xl font-semibold text-slate-900">{request.description}</h1>
          <p className="text-sm text-slate-500">
            {request.site.name}
            {request.asset && (
              <>
                {" · "}
                <Link href={`/app/assets/${request.asset.id}`} className="text-blue-700">
                  {request.asset.assetCode}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone={PRIORITY_TONE[request.priority]}>{tp(request.priority)}</Badge>
          <Badge tone={request.status === "NEW" ? "amber" : request.status === "CONVERTED" ? "green" : "slate"}>
            {ts(request.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{tc("description")}</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-700">
              <p>{request.description}</p>
              {request.photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {request.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="Request attachment" className="h-24 w-full rounded-md object-cover" />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {request.status === "NEW" && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("triageThisRequest")}</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <AiTriageButton requestId={request.id} />
                <div className="flex flex-wrap gap-2">
                  <form action={convert}>
                    <Button type="submit" variant="primary">
                      {t("convertToWorkOrder")}
                    </Button>
                  </form>
                  <Link
                    href={`/app/rfq/new?requestId=${request.id}`}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {t("sendToVendorsRfq")}
                  </Link>
                  <form action={reject}>
                    <Button type="submit" variant="ghost">
                      {t("reject")}
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          )}

          {request.workOrder && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("linkedWorkOrder")}</h2>
              </CardHeader>
              <CardBody>
                <Link href={`/app/work-orders/${request.workOrder.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                  {request.workOrder.number} — {tw(request.workOrder.status)}
                </Link>
              </CardBody>
            </Card>
          )}

          {request.rfq && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{t("linkedRfq")}</h2>
              </CardHeader>
              <CardBody>
                <Link href={`/app/rfq/${request.rfq.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                  {request.rfq.number}
                </Link>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("requester")}</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Info label={t("name")} value={request.requesterName} />
              {request.requesterPhone && <Info label={t("phone")} value={request.requesterPhone} />}
              {request.requesterEmail && <Info label={t("email")} value={request.requesterEmail} />}
              <Info label={t("channel")} value={tsrc(request.source)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">{t("details")}</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Info label={tc("category")} value={request.category ?? "—"} />
              <Info label={t("received")} value={format(request.createdAt, "dd MMM yyyy, HH:mm")} />
              <Info label={t("lastUpdated")} value={format(request.updatedAt, "dd MMM yyyy, HH:mm")} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-end font-medium text-slate-800">{value}</span>
    </div>
  );
}
