import type { NextAuthConfig } from "next-auth";
import { accountType } from "@/lib/roles";
import type { UserRole } from "@/generated/prisma/client";

type AppJWT = {
  role: UserRole;
  orgId: string | null;
  vendorId: string | null;
  locale: string;
  accountType: "platform" | "customer" | "vendor";
};

/**
 * Edge-safe config: no providers, no Prisma. Used by middleware to read the
 * session JWT for route protection without pulling Node-only code (Prisma,
 * bcrypt) into the Edge runtime. The full config with the Credentials
 * provider lives in auth.ts and is used by the route handler + server actions.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      const t = token as typeof token & Partial<AppJWT>;
      if (user) {
        const u = user as typeof user & AppJWT;
        t.role = u.role;
        t.orgId = u.orgId;
        t.vendorId = u.vendorId;
        t.locale = u.locale;
        t.accountType = accountType(u.role);
      }
      return t;
    },
    session: async ({ session, token }) => {
      const t = token as typeof token & AppJWT;
      if (session.user) {
        session.user.id = t.sub as string;
        session.user.role = t.role;
        session.user.orgId = t.orgId ?? null;
        session.user.vendorId = t.vendorId ?? null;
        session.user.locale = t.locale ?? "en";
        session.user.accountType = t.accountType;
      }
      return session;
    },
  },
};
