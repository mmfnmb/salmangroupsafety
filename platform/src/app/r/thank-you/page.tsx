import { Card, CardBody } from "@/components/ui/card";

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-slate-50 p-5">
      <Card className="w-full">
        <CardBody className="space-y-3 text-center">
          <p className="text-2xl">✅</p>
          <h1 className="text-base font-semibold text-slate-900">Request submitted</h1>
          {ref && (
            <p className="text-sm text-slate-600">
              Reference number: <span className="font-mono font-medium">{ref}</span>
            </p>
          )}
          <p className="text-xs text-slate-500">
            Our maintenance team has been notified and will follow up according to the applicable SLA.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
