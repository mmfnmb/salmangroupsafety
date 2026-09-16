"use client";

import { useState, useTransition } from "react";
import { aiTriageRequest } from "@/server/ai";
import type { TriageSuggestion } from "@/lib/ai";

export function AiTriageButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<TriageSuggestion | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleClick() {
    setNotice(null);
    setSuggestion(null);
    startTransition(async () => {
      const result = await aiTriageRequest(requestId);
      if (!result.ok) {
        setNotice(
          result.reason === "not_configured"
            ? "AI triage is built and ready — pending activation (ANTHROPIC_API_KEY not configured)."
            : `AI triage failed: ${result.message ?? "unknown error"}`
        );
        return;
      }
      setSuggestion(result.data);
    });
  }

  return (
    <div className="text-xs">
      <button type="button" onClick={handleClick} disabled={isPending} className="text-blue-700 hover:underline disabled:opacity-50">
        {isPending ? "Analyzing…" : "✨ AI suggestion"}
      </button>
      {notice && <p className="mt-1 max-w-52 text-amber-600">{notice}</p>}
      {suggestion && (
        <div className="mt-1 max-w-56 rounded-md border border-blue-200 bg-blue-50 p-2 text-slate-700">
          <p><strong>{suggestion.category}</strong> · {suggestion.priority}{suggestion.safetyRisk ? " · ⚠️ safety risk" : ""}</p>
          <p className="text-slate-500">Suggested trade: {suggestion.suggestedTrade}</p>
          <p className="mt-1 text-slate-500">{suggestion.reasoning}</p>
        </div>
      )}
    </div>
  );
}
