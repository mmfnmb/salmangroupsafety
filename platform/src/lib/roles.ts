import type { UserRole } from "@/generated/prisma/client";

export const PLATFORM_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "PROCUREMENT_MANAGER",
  "VENDOR_MANAGER",
  "FINANCE_ADMIN",
  "PLATFORM_AUDITOR",
];

export const CUSTOMER_ROLES: UserRole[] = [
  "ACCOUNT_OWNER",
  "FACILITY_MANAGER",
  "MAINTENANCE_MANAGER",
  "MAINTENANCE_SUPERVISOR",
  "TECHNICIAN",
  "PROCUREMENT_USER",
  "FINANCE_USER",
  "REQUESTER",
  "VIEWER",
];

export const VENDOR_ROLES: UserRole[] = [
  "VENDOR_OWNER",
  "VENDOR_ESTIMATOR",
  "VENDOR_SUPERVISOR",
  "VENDOR_TECHNICIAN",
  "VENDOR_FINANCE",
];

export function accountType(role: UserRole): "platform" | "customer" | "vendor" {
  if (PLATFORM_ROLES.includes(role)) return "platform";
  if (VENDOR_ROLES.includes(role)) return "vendor";
  return "customer";
}

// Roles allowed to see cost/financial figures on work orders, quotations, contracts.
export const FINANCIAL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "OPERATIONS_MANAGER",
  "ACCOUNT_OWNER",
  "FACILITY_MANAGER",
  "MAINTENANCE_MANAGER",
  "PROCUREMENT_USER",
  "FINANCE_USER",
];

// Roles allowed to manage assets, sites, PM plans, technicians for an org.
export const ORG_MANAGER_ROLES: UserRole[] = [
  "ACCOUNT_OWNER",
  "FACILITY_MANAGER",
  "MAINTENANCE_MANAGER",
];

export function canViewFinancials(role: UserRole) {
  return FINANCIAL_ROLES.includes(role);
}

export function canManageOrg(role: UserRole) {
  return ORG_MANAGER_ROLES.includes(role);
}
