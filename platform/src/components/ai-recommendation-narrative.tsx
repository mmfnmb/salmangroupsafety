"use client";

import { useState, useTransition } from "react";
import { aiNarrateRfqRecommendation } from "@/server/ai";

export function AiRecommendationNarrative({ rfqId }: { rfqId: string }) {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleClick() {
    setNotice(null);
    setText(null);
    startTransition(async () => {
      const result = await aiNarrateRfqRecommendation(rfqId);
      if (!result.ok) {
        setNotice(
          result.reason === "not_configured"
            ? "AI-written recommendation narratives are built and ready — pending activation (ANTHROPIC_API_KEY not configured)."
            : `Couldn't generate a narrative: ${result.message ?? "unknown error"}`
        );
        return;
      }
      setText(result.data);
    });
  }

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <button type="button" onClick={handleClick} disabled={isPending} className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50">
        {isPending ? "Writing explanation…" : "✨ Explain this recommendation with AI"}
      </button>
      {notice && <p className="mt-2 text-xs text-amber-600">{notice}</p>}
      {text && <p className="mt-2 text-sm text-slate-700">{text}</p>}
    </div>
  );
}
