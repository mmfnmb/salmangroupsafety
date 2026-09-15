import type { PMFrequency } from "@/generated/prisma/client";
import { addDays, addMonths } from "date-fns";

/** Advances a due date forward by one occurrence of the given PM frequency. */
export function nextPMDueDate(from: Date, frequency: PMFrequency, intervalValue: number): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(from, intervalValue);
    case "WEEKLY":
      return addDays(from, 7 * intervalValue);
    case "MONTHLY":
      return addMonths(from, intervalValue);
    case "QUARTERLY":
      return addMonths(from, 3 * intervalValue);
    case "SEMIANNUAL":
      return addMonths(from, 6 * intervalValue);
    case "ANNUAL":
      return addMonths(from, 12 * intervalValue);
    case "METER_BASED":
      // Meter-based plans are due when a meter reading crosses intervalValue units;
      // generateUpcomingSchedules() falls back to a monthly check-in placeholder.
      return addMonths(from, 1);
    default:
      return addMonths(from, 1);
  }
}

/** Generates PMSchedule due dates up to `horizonDays` ahead, starting from `from`. */
export function generateUpcomingDueDates(
  from: Date,
  frequency: PMFrequency,
  intervalValue: number,
  horizonDays = 90
): Date[] {
  const dates: Date[] = [];
  let cursor = from;
  const horizon = addDays(from, horizonDays);
  while (cursor <= horizon) {
    dates.push(cursor);
    cursor = nextPMDueDate(cursor, frequency, intervalValue);
  }
  return dates;
}
