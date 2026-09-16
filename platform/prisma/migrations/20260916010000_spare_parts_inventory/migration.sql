-- AlterTable
ALTER TABLE "WorkOrderPartUsed" ADD COLUMN     "partId" TEXT,
ADD COLUMN     "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "partNumber" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "supplierName" TEXT,
    "store" TEXT,
    "unitCostSar" DECIMAL(10,2),
    "stockQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStockQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compatibleWith" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Part_orgId_idx" ON "Part"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Part_orgId_partNumber_key" ON "Part"("orgId", "partNumber");

-- AddForeignKey
ALTER TABLE "WorkOrderPartUsed" ADD CONSTRAINT "WorkOrderPartUsed_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

