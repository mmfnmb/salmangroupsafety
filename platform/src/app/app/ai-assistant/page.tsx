import { requireOrgSession } from "@/lib/tenant";
import { isAiConfigured } from "@/lib/ai";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CAPABILITIES = [
  {
    title: "Request triage",
    where: "Maintenance Requests",
    href: "/app/requests",
    description:
      "Suggests category, priority, safety-risk flag and the trade needed for an incoming request — advisory only, a human decides.",
  },
  {
    title: "Scope of work drafting",
    where: "New RFQ",
    href: "/app/rfq/new",
    description:
      "Expands a short problem description into a full scope of work (inspection, repair, materials, testing, warranty, safety, exclusions) for a human to review before release.",
  },
  {
    title: "Quotation comparison narrative",
    where: "RFQ comparison",
    href: "/app/rfq",
    description:
      "Explains in plain language why the best-value quote was recommended — the underlying score is always computed from real data, never invented by the model.",
  },
  {
    title: "Repair vs. replace advisor",
    where: "Asset passport",
    href: "/app/assets",
    description: "Not yet wired to a screen. Planned to reason over an asset's age, repair cost history and criticality once activated.",
  },
];

export default async function AiAssistantPage() {
  await requireOrgSession();
  const configured = isAiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Assistant</h1>
        <p className="text-sm text-slate-500">
          Built and wired into the workflows below — every screen calls the real Anthropic API, not a mock.
        </p>
      </div>

      <Card className={configured ? "border-green-300 bg-green-50/40" : "border-amber-300 bg-amber-50/40"}>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {configured ? "AI features are active" : "Activation pending"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {configured
                ? "ANTHROPIC_API_KEY is configured — every capability below is live."
                : "The integration code is complete; it needs ANTHROPIC_API_KEY set in the environment to start responding. Nothing on this platform fabricates an AI answer in the meantime."}
            </p>
          </div>
          <Badge tone={configured ? "green" : "amber"}>{configured ? "Active" : "Coming soon"}</Badge>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CAPABILITIES.map((c) => {
          const live = configured && c.href !== "/app/assets";
          return (
            <Card key={c.title} className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <Badge tone={live ? "green" : "amber"}>{live ? "Active" : "Coming soon"}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
              <p className="mt-3 text-xs text-slate-400">Find it in: {c.where}</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-900">Safety rules (always on, regardless of activation)</h2></CardHeader>
        <CardBody>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-600">
            <li>AI never approves spending, awards a vendor, or closes a safety-critical issue on its own.</li>
            <li>AI never overrides a technician&apos;s diagnosis or changes a contractual value.</li>
            <li>Every suggestion is advisory — a human reviews and acts on it explicitly.</li>
            <li>If the AI isn&apos;t activated, the screen says so plainly instead of showing a fabricated result.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
