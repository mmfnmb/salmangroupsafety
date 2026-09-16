import { requireVendorSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { submitQuotation } from "@/server/rfq";
import { format } from "date-fns";

export default async function VendorRfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireVendorSession();

  const invite = await prisma.rfqVendor.findFirst({ where: { rfqId: id, vendorId: session.vendorId } });
  if (!invite) notFound();

  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id },
    include: { site: true, organization: true, quotations: { where: { vendorId: session.vendorId } } },
  });
  const myQuote = rfq.quotations[0];
  const canQuote = rfq.status !== "AWARDED" && rfq.status !== "CANCELLED";

  const submitAction = submitQuotation.bind(null, rfq.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs text-slate-400">{rfq.number} · {rfq.organization.name}</p>
        <h1 className="text-xl font-semibold text-slate-900">{rfq.title}</h1>
        <p className="text-sm text-slate-500">{rfq.site.name}</p>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-900">Scope of work</h2></CardHeader>
        <CardBody><p className="whitespace-pre-wrap text-sm text-slate-700">{rfq.scopeOfWork}</p></CardBody>
      </Card>

      {rfq.status === "AWARDED" && (
        <Card className={myQuote?.status === "AWARDED" ? "border-green-300" : ""}>
          <CardBody>
            <Badge tone={myQuote?.status === "AWARDED" ? "green" : "slate"}>
              {myQuote?.status === "AWARDED" ? "You were awarded this contract" : "Awarded to another vendor"}
            </Badge>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">{myQuote ? "Your quotation" : "Submit a quotation"}</h2>
        </CardHeader>
        <CardBody>
          {canQuote ? (
            <form action={submitAction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Labor cost (SAR)" htmlFor="laborCostSar">
                  <Input id="laborCostSar" name="laborCostSar" type="number" step="0.01" defaultValue={myQuote?.laborCostSar?.toString() ?? ""} />
                </Field>
                <Field label="Materials cost (SAR)" htmlFor="materialsCostSar">
                  <Input id="materialsCostSar" name="materialsCostSar" type="number" step="0.01" defaultValue={myQuote?.materialsCostSar?.toString() ?? ""} />
                </Field>
              </div>
              <Field label="Total price (SAR)" htmlFor="totalCostSar" required>
                <Input id="totalCostSar" name="totalCostSar" type="number" step="0.01" required defaultValue={myQuote?.totalCostSar?.toString() ?? ""} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Lead time (days)" htmlFor="leadTimeDays">
                  <Input id="leadTimeDays" name="leadTimeDays" type="number" min="0" defaultValue={myQuote?.leadTimeDays ?? ""} />
                </Field>
                <Field label="Warranty (months)" htmlFor="warrantyMonths">
                  <Input id="warrantyMonths" name="warrantyMonths" type="number" min="0" defaultValue={myQuote?.warrantyMonths ?? ""} />
                </Field>
              </div>
              <Field label="Payment terms" htmlFor="paymentTerms">
                <Input id="paymentTerms" name="paymentTerms" placeholder="e.g. 50% advance, 50% on completion" defaultValue={myQuote?.paymentTerms ?? ""} />
              </Field>
              <Field label="Exclusions" htmlFor="exclusions">
                <Textarea id="exclusions" name="exclusions" rows={2} defaultValue={myQuote?.exclusions ?? ""} />
              </Field>
              <Field label="Quote valid until" htmlFor="validUntil">
                <Input id="validUntil" name="validUntil" type="date" defaultValue={myQuote?.validUntil ? format(myQuote.validUntil, "yyyy-MM-dd") : ""} />
              </Field>
              <Button type="submit" className="w-full">{myQuote ? "Update quotation" : "Submit quotation"}</Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">This RFQ is closed.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
