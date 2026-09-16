/**
 * Quotation comparison math (sections 27 & 32). The cheapest quote must
 * never automatically win: a quote only qualifies commercially once its
 * technical score clears the minimum, and the final ranking blends
 * technical quality, price competitiveness and the vendor's own track
 * record — not price alone.
 */
export const TECHNICAL_QUALIFYING_THRESHOLD = 70;

export const BEST_VALUE_WEIGHTS = {
  technical: 0.5,
  commercial: 0.3,
  trackRecord: 0.2,
} as const;

export interface QuoteForEvaluation {
  id: string;
  vendorId: string;
  totalCostSar: number | null;
  technicalScore: number | null;
}

/** Cheapest *qualifying* quote scores 100; others scale down proportionally. */
export function computeCommercialScores(quotes: QuoteForEvaluation[]): Record<string, number | null> {
  const qualifying = quotes.filter(
    (q) => q.totalCostSar != null && q.technicalScore != null && q.technicalScore >= TECHNICAL_QUALIFYING_THRESHOLD
  );
  const cheapest = qualifying.length > 0 ? Math.min(...qualifying.map((q) => q.totalCostSar!)) : null;

  const scores: Record<string, number | null> = {};
  for (const q of quotes) {
    if (cheapest == null || q.totalCostSar == null || q.technicalScore == null || q.technicalScore < TECHNICAL_QUALIFYING_THRESHOLD) {
      scores[q.id] = null;
      continue;
    }
    scores[q.id] = Math.round((cheapest / q.totalCostSar) * 100);
  }
  return scores;
}

export function computeBestValueScore(
  technicalScore: number | null,
  commercialScore: number | null,
  vendorTrackRecordScore: number | null
): number | null {
  if (technicalScore == null || technicalScore < TECHNICAL_QUALIFYING_THRESHOLD) return null;
  const parts: { value: number; weight: number }[] = [{ value: technicalScore, weight: BEST_VALUE_WEIGHTS.technical }];
  if (commercialScore != null) parts.push({ value: commercialScore, weight: BEST_VALUE_WEIGHTS.commercial });
  if (vendorTrackRecordScore != null) parts.push({ value: vendorTrackRecordScore, weight: BEST_VALUE_WEIGHTS.trackRecord });
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);
}
