import "server-only";
import { prisma } from "@/lib/prisma";
import { generateUpcomingDueDates } from "@/lib/pm-schedule";
import { nextWorkOrderNumber } from "@/lib/numbering";

/** (Re)generates PMSchedule rows for a plan out to a 90-day horizon. Idempotent per due date. */
export async function generateSchedulesForPlan(pmPlanId: string) {
  const plan = await prisma.pMPlan.findUniqueOrThrow({ where: { id: pmPlanId } });
  if (!plan.isActive) return;

  const existing = await prisma.pMSchedule.findMany({ where: { pmPlanId }, select: { dueDate: true } });
  const existingDates = new Set(existing.map((s) => s.dueDate.toISOString().slice(0, 10)));

  const dueDates = generateUpcomingDueDates(new Date(), plan.frequency, plan.intervalValue, 90);
  const toCreate = dueDates.filter((d) => !existingDates.has(d.toISOString().slice(0, 10)));

  if (toCreate.length > 0) {
    await prisma.pMSchedule.createMany({
      data: toCreate.map((dueDate) => ({ pmPlanId, dueDate, status: "UPCOMING" as const })),
    });
  }
}

/**
 * Marks schedules whose due date has arrived as DUE/OVERDUE, then creates a
 * PREVENTIVE work order for each one that doesn't already have one.
 * Called from the manual "Generate due PM" action and from the daily cron route.
 */
export async function generateDueWorkOrders(orgId: string) {
  const now = new Date();

  const schedules = await prisma.pMSchedule.findMany({
    where: {
      status: { in: ["UPCOMING", "DUE", "OVERDUE"] },
      dueDate: { lte: now },
      pmPlan: { orgId },
      workOrder: null,
    },
    include: { pmPlan: { include: { asset: { include: { site: true } } } } },
  });

  let created = 0;
  for (const schedule of schedules) {
    const overdue = schedule.dueDate < now;
    await prisma.pMSchedule.update({
      where: { id: schedule.id },
      data: { status: overdue ? "OVERDUE" : "DUE" },
    });

    const number = await nextWorkOrderNumber(orgId);
    await prisma.workOrder.create({
      data: {
        orgId,
        number,
        siteId: schedule.pmPlan.asset.siteId,
        assetId: schedule.pmPlan.assetId,
        type: "PREVENTIVE",
        category: "Preventive Maintenance",
        priority: "NORMAL",
        description: `Scheduled PM: ${schedule.pmPlan.name}`,
        assignedTechnicianId: schedule.pmPlan.assignedTechnicianId,
        pmScheduleId: schedule.id,
      },
    });
    created++;
  }
  return created;
}
