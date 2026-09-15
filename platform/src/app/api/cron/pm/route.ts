import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSchedulesForPlan, generateDueWorkOrders } from "@/lib/pm-engine";

/**
 * Daily job: extends each active PM plan's schedule horizon, then converts
 * any due/overdue schedules into work orders. Wired to Vercel Cron (see
 * vercel.json) and guarded by CRON_SECRET so it can't be triggered publicly.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.pMPlan.findMany({ where: { isActive: true }, select: { id: true } });
  for (const plan of plans) {
    await generateSchedulesForPlan(plan.id);
  }

  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let totalCreated = 0;
  for (const org of orgs) {
    totalCreated += await generateDueWorkOrders(org.id);
  }

  return NextResponse.json({ ok: true, plansRefreshed: plans.length, workOrdersCreated: totalCreated });
}
