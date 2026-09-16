import { prisma } from "@/lib/prisma";
import { ORG_MANAGER_ROLES } from "@/lib/roles";

/** Writes a Notification row for every active manager in the org. Used at real
 * business events (emergency request, approval needed) — never generated speculatively. */
export async function notifyOrgManagers(orgId: string, type: string, title: string, body: string) {
  const managers = await prisma.user.findMany({
    where: { orgId, role: { in: ORG_MANAGER_ROLES }, status: "ACTIVE" },
    select: { id: true },
  });
  if (managers.length === 0) return;
  await prisma.notification.createMany({
    data: managers.map((m) => ({ orgId, userId: m.id, type, title, body })),
  });
}

export async function notifyUser(orgId: string, userId: string, type: string, title: string, body: string) {
  await prisma.notification.create({ data: { orgId, userId, type, title, body } });
}

export type LiveAlert = { title: string; body: string; href: string };

/** Alerts derived live from current state (overdue PM, expiring contracts) — never
 * persisted, so they never go stale or need a background job to clear them. */
export async function getLiveAlerts(orgId: string): Promise<LiveAlert[]> {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [overduePm, expiringContracts] = await Promise.all([
    prisma.pMSchedule.findMany({
      where: { pmPlan: { orgId }, dueDate: { lt: now }, status: { in: ["UPCOMING", "DUE", "OVERDUE"] } },
      include: { pmPlan: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.contract.findMany({
      where: { orgId, status: "ACTIVE", endDate: { gte: now, lte: in30Days } },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
  ]);

  const alerts: LiveAlert[] = [];
  for (const s of overduePm) {
    alerts.push({
      title: `PM overdue: ${s.pmPlan.name}`,
      body: `Was due ${s.dueDate.toLocaleDateString()}`,
      href: "/app/pm",
    });
  }
  for (const c of expiringContracts) {
    const days = Math.ceil((c.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    alerts.push({
      title: `Contract ${c.contractNumber} expires in ${days}d`,
      body: c.type,
      href: "/app/contracts",
    });
  }
  return alerts;
}
