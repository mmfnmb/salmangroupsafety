import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage, UploadError } from "@/lib/storage";

/**
 * Signed-in org members upload under their own orgId. Unauthenticated
 * callers (the public QR-scan / report-a-problem portal) must pass an
 * orgId that resolves to a real organization — that's the same public
 * information already embedded as a hidden field on that form.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const session = await auth();
  let scopeId: string;

  if (session?.user?.accountType === "customer" && session.user.orgId) {
    scopeId = session.user.orgId;
  } else if (session?.user?.accountType === "vendor" && session.user.vendorId) {
    scopeId = session.user.vendorId;
  } else {
    const publicOrgId = formData.get("orgId");
    if (typeof publicOrgId !== "string" || !publicOrgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }
    const org = await prisma.organization.findUnique({ where: { id: publicOrgId }, select: { id: true } });
    if (!org) return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
    scopeId = org.id;
  }

  try {
    const url = await saveUploadedImage(scopeId, file);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
