import "server-only";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Every server action / route handler that touches tenant data MUST go through
 * this helper and use the returned orgId in every Prisma `where` clause.
 * Never trust an orgId passed from the client.
 */
export async function requireOrgSession() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== "customer" || !session.user.orgId) {
    redirect("/login");
  }
  return {
    userId: session.user.id,
    orgId: session.user.orgId as string,
    role: session.user.role,
    locale: session.user.locale,
  };
}

export async function requirePlatformSession() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== "platform") {
    redirect("/login");
  }
  return { userId: session.user.id, role: session.user.role };
}

export async function requireVendorSession() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== "vendor" || !session.user.vendorId) {
    redirect("/login");
  }
  return { userId: session.user.id, vendorId: session.user.vendorId as string, role: session.user.role };
}
