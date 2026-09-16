"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canViewFinancials } from "@/lib/roles";
import { generateWeeklyReportData } from "@/lib/weekly-report";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function generateCurrentWeeklyReport() {
  const session = await requireOrgSession();
  if (!canViewFinancials(session.role)) throw new Error("Not authorized");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  const data = await generateWeeklyReportData(session.orgId, weekStart, weekEnd, "WEEKLY");

  const report = await prisma.weeklyReport.upsert({
    where: { orgId_period_weekStart: { orgId: session.orgId, period: "WEEKLY", weekStart } },
    update: { data, generatedAt: new Date() },
    create: { orgId: session.orgId, period: "WEEKLY", weekStart, weekEnd, data },
  });

  revalidatePath("/app/reports");
  redirect(`/app/reports/${report.id}`);
}

export async function generateCurrentMonthlyReport() {
  const session = await requireOrgSession();
  if (!canViewFinancials(session.role)) throw new Error("Not authorized");

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const data = await generateWeeklyReportData(session.orgId, monthStart, monthEnd, "MONTHLY");

  const report = await prisma.weeklyReport.upsert({
    where: { orgId_period_weekStart: { orgId: session.orgId, period: "MONTHLY", weekStart: monthStart } },
    update: { data, generatedAt: new Date() },
    create: { orgId: session.orgId, period: "MONTHLY", weekStart: monthStart, weekEnd: monthEnd, data },
  });

  revalidatePath("/app/reports");
  redirect(`/app/reports/${report.id}`);
}
