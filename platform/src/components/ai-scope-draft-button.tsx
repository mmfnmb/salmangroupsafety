"use client";

import { useState, useTransition } from "react";
import { aiDraftScopeOfWork } from "@/server/ai";
import { Button } from "@/components/ui/button";

export function AiScopeDraftButton({
  assetSelectId,
  titleInputId,
  categoryInputId,
  targetTextareaId,
}: {
  assetSelectId: string;
  titleInputId: string;
  categoryInputId: string;
  targetTextareaId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function handleDraft() {
    const problemField = document.getElementById(targetTextareaId) as HTMLTextAreaElement | null;
    const assetSelect = document.getElementById(assetSelectId) as HTMLSelectElement | null;
    const titleField = document.getElementById(titleInputId) as HTMLInputElement | null;
    const category = (document.getElementById(categoryInputId) as HTMLInputElement | null)?.value || null;

    const assetName = assetSelect?.selectedOptions[0]?.text || titleField?.value || "the reported asset";
    const currentText = problemField?.value?.trim();

    if (!currentText) {
      setNotice("Describe the problem in the box below first — AI will expand it into a full scope of work.");
      return;
    }

    startTransition(async () => {
      const result = await aiDraftScopeOfWork({ assetName, problem: currentText, category });
      if (!result.ok) {
        setNotice(
          result.reason === "not_configured"
            ? "AI drafting is built and wired up, but not yet activated on this deployment — it needs an ANTHROPIC_API_KEY."
            : `AI drafting failed: ${result.message ?? "unknown error"}`
        );
        return;
      }
      if (problemField) problemField.value = result.data;
      setNotice(null);
    });
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="secondary" onClick={handleDraft} disabled={isPending} className="text-xs">
        {isPending ? "Drafting…" : "✨ Expand into full scope with AI"}
      </Button>
      {notice && <p className="text-xs text-amber-600">{notice}</p>}
    </div>
  );
}
