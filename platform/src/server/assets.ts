"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgSession } from "@/lib/tenant";
import { canManageOrg } from "@/lib/roles";
import { suggestAssetCode } from "@/lib/numbering";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AssetCriticality, AssetCondition, AssetStatus } from "@/generated/prisma/client";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function decimal(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

export async function createAsset(formData: FormData) {
  const session = await requireOrgSession();
  if (!canManageOrg(session.role)) throw new Error("Not authorized to create assets");

  const siteId = str(formData, "siteId");
  const name = str(formData, "name");
  if (!siteId || !name) throw new Error("Site and name are required");

  const site = await prisma.site.findFirst({ where: { id: siteId, orgId: session.orgId } });
  if (!site) throw new Error("Site not found");

  const buildingId = str(formData, "buildingId");
  const systemTypeId = str(formData, "systemTypeId");
  let systemCode: string | null = null;
  if (systemTypeId) {
    const st = await prisma.assetSystemType.findFirst({
      where: { id: systemTypeId, OR: [{ orgId: session.orgId }, { orgId: null }] },
    });
    systemCode = st?.code ?? null;
  }

  let building = null;
  if (buildingId) {
    building = await prisma.building.findFirst({ where: { id: buildingId, siteId } });
  }

  const manualCode = str(formData, "assetCode");
  const assetCode =
    manualCode ??
    (await suggestAssetCode({
      orgId: session.orgId,
      siteCode: site.code,
      buildingName: building?.name,
      systemCode,
      typeCode: str(formData, "type"),
    }));

  const asset = await prisma.asset.create({
    data: {
      orgId: session.orgId,
      siteId,
      buildingId: buildingId ?? undefined,
      floorId: str(formData, "floorId") ?? undefined,
      roomId: str(formData, "roomId") ?? undefined,
      systemTypeId: systemTypeId ?? undefined,
      assetCode,
      name,
      nameAr: str(formData, "nameAr"),
      type: str(formData, "type"),
      manufacturer: str(formData, "manufacturer"),
      brand: str(formData, "brand"),
      model: str(formData, "model"),
      serialNumber: str(formData, "serialNumber"),
      criticality: (str(formData, "criticality") as AssetCriticality) ?? "MEDIUM",
      condition: (str(formData, "condition") as AssetCondition) ?? "GOOD",
      status: (str(formData, "status") as AssetStatus) ?? "OPERATIONAL",
      supplierName: str(formData, "supplierName"),
      purchasePriceSar: decimal(formData, "purchasePriceSar"),
      installationCostSar: decimal(formData, "installationCostSar"),
      purchaseDate: date(formData, "purchaseDate"),
      installationDate: date(formData, "installationDate"),
      commissioningDate: date(formData, "commissioningDate"),
      warrantyStart: date(formData, "warrantyStart"),
      warrantyEnd: date(formData, "warrantyEnd"),
      warrantyProvider: str(formData, "warrantyProvider"),
      usefulLifeYears: decimal(formData, "usefulLifeYears"),
      replacementCostSar: decimal(formData, "replacementCostSar"),
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "CREATE",
      entityType: "Asset",
      entityId: asset.id,
      newValue: { assetCode, name },
    },
  });

  revalidatePath("/app/assets");
  redirect(`/app/assets/${asset.id}`);
}
