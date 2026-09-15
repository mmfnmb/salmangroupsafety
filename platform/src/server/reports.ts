"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canViewFinancials } from "@/lib/roles";
import { generateWeeklyReportData } from "@/lib/weekly-report";
import { startOfWeek, endOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function generateCurrentWeeklyReport() {
  const session = await requireOrgSession();
  if (!canViewFinancials(session.role)) throw new Error("Not authorized");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  const data = await generateWeeklyReportData(session.orgId, weekStart, weekEnd);

  const report = await prisma.weeklyReport.upsert({
    where: { orgId_weekStart: { orgId: session.orgId, weekStart } },
    update: { data, generatedAt: new Date() },
    create: { orgId: session.orgId, weekStart, weekEnd, data },
  });

  revalidatePath("/app/reports");
  redirect(`/app/reports/${report.id}`);
}
