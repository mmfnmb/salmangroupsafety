import { prisma } from "@/lib/prisma";

/** REQ-YYYY-XXXXXX, sequential per organization per year. */
export async function nextRequestReference(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.maintenanceRequest.count({
    where: { orgId, referenceNumber: { startsWith: `REQ-${year}-` } },
  });
  return `REQ-${year}-${String(count + 1).padStart(6, "0")}`;
}

/** WO-YYYY-XXXXXX, sequential per organization per year. */
export async function nextWorkOrderNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.workOrder.count({
    where: { orgId, number: { startsWith: `WO-${year}-` } },
  });
  return `WO-${year}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Suggests a permanent asset code: PROJECT-BUILDING-SYSTEM-TYPE-SEQUENCE.
 * The code is only a suggestion — once saved, it must never be auto-changed.
 */
export async function suggestAssetCode(params: {
  orgId: string;
  siteCode: string;
  buildingName?: string | null;
  systemCode?: string | null;
  typeCode?: string | null;
}): Promise<string> {
  const buildingPart = (params.buildingName || "GEN").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const systemPart = (params.systemCode || "GEN").toUpperCase();
  const typePart = (params.typeCode || "AST").toUpperCase();
  const prefix = `${params.siteCode}-${buildingPart}-${systemPart}-${typePart}-`;

  const count = await prisma.asset.count({
    where: { orgId: params.orgId, assetCode: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}
