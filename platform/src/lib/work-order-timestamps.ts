import type { WorkOrderStatus } from "@/generated/prisma/client";

/** Which timestamp field to stamp when a work order first reaches a given status. */
export const TIMESTAMP_FOR_STATUS: Partial<
  Record<WorkOrderStatus, "arrivedAt" | "startedAt" | "completedAt" | "closedAt">
> = {
  ON_SITE: "arrivedAt",
  IN_PROGRESS: "startedAt",
  COMPLETED: "completedAt",
  CLOSED: "closedAt",
};
