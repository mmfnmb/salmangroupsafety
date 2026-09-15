import type { UserRole } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    orgId: string | null;
    vendorId: string | null;
    locale: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      orgId: string | null;
      vendorId: string | null;
      locale: string;
      accountType: "platform" | "customer" | "vendor";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    orgId: string | null;
    vendorId: string | null;
    locale: string;
    accountType: "platform" | "customer" | "vendor";
  }
}
