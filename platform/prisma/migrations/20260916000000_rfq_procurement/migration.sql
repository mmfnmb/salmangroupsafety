-- DropIndex
DROP INDEX "Rfq_number_key";

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "evaluationNotes" TEXT,
ADD COLUMN     "exclusions" TEXT,
ADD COLUMN     "isRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rfq" ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "awardedAt" TIMESTAMP(3),
ADD COLUMN     "awardedByUserId" TEXT,
ADD COLUMN     "awardedQuotationId" TEXT,
ADD COLUMN     "awardedVendorId" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "platformFeePercent" DECIMAL(5,2),
ADD COLUMN     "platformFeeSar" DECIMAL(12,2),
ADD COLUMN     "quoteDeadline" TIMESTAMP(3),
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "siteId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_rfqId_vendorId_key" ON "Quotation"("rfqId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_requestId_key" ON "Rfq"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_awardedQuotationId_key" ON "Rfq"("awardedQuotationId");

-- CreateIndex
CREATE INDEX "Rfq_orgId_status_idx" ON "Rfq"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_orgId_number_key" ON "Rfq"("orgId", "number");

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_awardedQuotationId_fkey" FOREIGN KEY ("awardedQuotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

