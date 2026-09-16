-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- DropIndex
DROP INDEX "WeeklyReport_orgId_weekStart_key";

-- AlterTable
ALTER TABLE "WeeklyReport" ADD COLUMN     "period" "ReportPeriod" NOT NULL DEFAULT 'WEEKLY';

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_orgId_period_weekStart_key" ON "WeeklyReport"("orgId", "period", "weekStart");

