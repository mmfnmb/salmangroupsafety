import { prisma } from "@/lib/prisma";
import { StatCard, Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays } from "date-fns";
import Link from "next/link";

export default async function PlatformOverviewPage() {
  const [
    activeCustomers,
    approvedVendors,
    pendingVendors,
    activeJobs,
    waitingApproval,
    activeOrgsWithPlans,
    expiringVendorDocs,
    newLeads,
  ] = await Promise.all([
    prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.workOrder.count({ where: { status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.workOrder.count({ where: { status: "WAITING_APPROVAL" } }),
    prisma.organization.findMany({ where: { subscriptionStatus: "ACTIVE" }, include: { plan: true } }),
    prisma.vendorDocument.count({ where: { expiryDate: { lte: addDays(new Date(), 30), gte: new Date() } } }),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);

  const mrr = activeOrgsWithPlans.reduce((sum, o) => sum + Number(o.plan?.monthlyPriceSar ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Platform Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Customers" value={activeCustomers} />
        <StatCard label="Approved Vendors" value={approvedVendors} />
        <StatCard label="Vendors Pending Review" value={pendingVendors} tone={pendingVendors > 0 ? "amber" : "green"} />
        <StatCard label="Active Maintenance Jobs" value={activeJobs} />
        <StatCard label="Awaiting Customer Approval" value={waitingApproval} />
        <StatCard label="Vendor Docs Expiring (30d)" value={expiringVendorDocs} tone={expiringVendorDocs > 0 ? "amber" : "green"} />
        <StatCard label="Estimated MRR" value={`SAR ${mrr.toLocaleString()}`} />
        <StatCard label="New Leads" value={newLeads} tone={newLeads > 0 ? "amber" : "green"} />
      </div>

      {pendingVendors > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Vendors awaiting review</p>
            <Link href="/platform/vendors" className="text-xs text-blue-700">Review →</Link>
          </CardHeader>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        RFQ conversion, vendor competition and GMV metrics will populate here once the managed procurement (RFQ)
        module is active. <Badge tone="slate">Phase 3</Badge>
      </p>
    </div>
  );
}
