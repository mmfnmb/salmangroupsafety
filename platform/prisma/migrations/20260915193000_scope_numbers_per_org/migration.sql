-- DropIndex
DROP INDEX "MaintenanceRequest_referenceNumber_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_referenceNumber_key";

-- DropIndex
DROP INDEX "WorkOrder_number_idx";

-- DropIndex
DROP INDEX "WorkOrder_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_orgId_referenceNumber_key" ON "MaintenanceRequest"("orgId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_orgId_number_key" ON "WorkOrder"("orgId", "number");

