import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/qr",
  "/r",
  "/thank-you",
  "/api/auth",
  "/api/public",
  "/api/cron",
  "/_next",
  "/favicon",
];

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const accountType = session.user.accountType;

  if (pathname.startsWith("/platform") && accountType !== "platform") {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }
  if (pathname.startsWith("/vendor-portal") && accountType !== "vendor") {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }
  if (pathname.startsWith("/app") && accountType === "vendor") {
    return NextResponse.redirect(new URL("/vendor-portal", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)).*)"],
};
