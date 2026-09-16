/**
 * Managed-procurement fee tiers (section 34 of the product spec). Purely
 * informational at this stage — the vendor invoices the customer directly
 * (section 35); nothing here charges or moves money. Shown transparently
 * on the award screen next to the contractor's own price, never folded
 * into it.
 */
export function platformFeeTier(totalCostSar: number): { percent: number | null; negotiated: boolean } {
  if (totalCostSar < 5_000) return { percent: 10, negotiated: false };
  if (totalCostSar < 25_000) return { percent: 8, negotiated: false };
  if (totalCostSar < 100_000) return { percent: 6, negotiated: false };
  if (totalCostSar < 500_000) return { percent: 4, negotiated: false };
  return { percent: null, negotiated: true };
}

export function computePlatformFee(totalCostSar: number): { percent: number | null; feeSar: number | null; negotiated: boolean } {
  const tier = platformFeeTier(totalCostSar);
  if (tier.negotiated || tier.percent === null) return { percent: null, feeSar: null, negotiated: true };
  return { percent: tier.percent, feeSar: Math.round(totalCostSar * (tier.percent / 100) * 100) / 100, negotiated: false };
}
