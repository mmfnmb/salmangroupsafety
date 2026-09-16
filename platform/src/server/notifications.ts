"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const session = await requireOrgSession();
  await prisma.notification.updateMany({
    where: { id: notificationId, orgId: session.orgId, userId: session.userId },
    data: { isRead: true },
  });
  revalidatePath("/app", "layout");
}

export async function markAllNotificationsRead() {
  const session = await requireOrgSession();
  await prisma.notification.updateMany({
    where: { orgId: session.orgId, userId: session.userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/app", "layout");
}
