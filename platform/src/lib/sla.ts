import type { RequestPriority } from "@/generated/prisma/client";

export const DEFAULT_SLA_MINUTES: Record<RequestPriority, { response: number; arrival: number; resolution: number }> = {
  CRITICAL: { response: 15, arrival: 30, resolution: 4 * 60 },
  EMERGENCY: { response: 30, arrival: 60, resolution: 8 * 60 },
  HIGH: { response: 2 * 60, arrival: 3 * 60, resolution: 24 * 60 },
  NORMAL: { response: 8 * 60, arrival: 12 * 60, resolution: 3 * 24 * 60 },
  LOW: { response: 24 * 60, arrival: 48 * 60, resolution: 7 * 24 * 60 },
};

export type SlaState = "on_track" | "at_risk" | "breached" | "met" | "n/a";

/**
 * At-risk threshold is 80% of the allotted window elapsed with no action yet.
 */
export function evaluateSlaStage(params: {
  createdAt: Date;
  actualAt: Date | null;
  allottedMinutes: number;
  now?: Date;
}): SlaState {
  const now = params.now ?? new Date();
  const deadline = new Date(params.createdAt.getTime() + params.allottedMinutes * 60_000);

  if (params.actualAt) {
    return params.actualAt <= deadline ? "met" : "breached";
  }
  if (now > deadline) return "breached";

  const elapsedRatio = (now.getTime() - params.createdAt.getTime()) / (params.allottedMinutes * 60_000);
  return elapsedRatio >= 0.8 ? "at_risk" : "on_track";
}
