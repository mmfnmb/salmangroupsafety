import "server-only";

/**
 * Real integration with the Anthropic Messages API — not a mock. It is
 * inert until ANTHROPIC_API_KEY is set in the environment; every caller
 * must check isAiConfigured() (or catch AiNotConfiguredError) and show an
 * honest "pending activation" state rather than inventing output. Once a
 * key is added, these functions work with no further code changes.
 */
export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not yet activated — no ANTHROPIC_API_KEY is configured.");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DEFAULT_MODEL = "claude-sonnet-5";

async function callClaude(system: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("AI response did not contain text output");
  return text;
}

export interface TriageSuggestion {
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "EMERGENCY" | "CRITICAL";
  safetyRisk: boolean;
  suggestedTrade: string;
  reasoning: string;
}

const TRIAGE_SYSTEM = `You are a maintenance triage assistant for a Saudi facility management platform.
Given a reported problem description, respond with ONLY valid JSON (no markdown fences, no commentary):
{"category": string, "priority": "LOW"|"NORMAL"|"HIGH"|"EMERGENCY"|"CRITICAL", "safetyRisk": boolean, "suggestedTrade": string, "reasoning": string}
This is advisory only — a human always makes the final call, especially for anything safety-related.`;

export async function triageRequest(description: string): Promise<TriageSuggestion> {
  const raw = await callClaude(TRIAGE_SYSTEM, description, 400);
  const parsed = JSON.parse(raw.trim());
  return parsed as TriageSuggestion;
}

const SCOPE_SYSTEM = `You are drafting a maintenance Scope of Work for an RFQ on a Saudi facility management
platform. Given the asset, problem and category, write a clear, professional scope of work covering: equipment
identification, existing problem, required inspection, required repair/replacement, required materials, required
testing, warranty requirement, safety requirement, documentation requirement, and exclusions. Plain text, no
markdown headers, ready for a human to review and edit before release. A human must approve it before the RFQ
is sent to vendors.`;

export async function draftScopeOfWork(input: { assetName: string; problem: string; category?: string | null }): Promise<string> {
  const prompt = `Asset: ${input.assetName}\nCategory: ${input.category ?? "unspecified"}\nProblem: ${input.problem}`;
  return callClaude(SCOPE_SYSTEM, prompt, 800);
}

const RECOMMENDATION_SYSTEM = `You are explaining a vendor quotation recommendation on a Saudi facility management
platform. You are given a short JSON summary of competing quotes and which one scored best on a best-value
formula (technical quality, price competitiveness and vendor track record — never price alone). Write 2-4 concise
sentences explaining, in plain business language, why that quote is recommended and what a decision-maker should
weigh before approving it. This is advisory only — the customer always makes the final award decision.`;

export async function narrateQuotationRecommendation(input: {
  quotes: { vendorName: string; totalCostSar: number | null; technicalScore: number | null; bestValueScore: number | null }[];
  recommendedVendorName: string;
}): Promise<string> {
  return callClaude(RECOMMENDATION_SYSTEM, JSON.stringify(input), 400);
}
