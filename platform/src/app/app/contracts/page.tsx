import { requireOrgSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createContract } from "@/server/contracts";
import { differenceInDays, format } from "date-fns";

export default async function ContractsPage() {
  const session = await requireOrgSession();
  const contracts = await prisma.contract.findMany({
    where: { orgId: session.orgId },
    orderBy: { endDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Contracts</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-start">Contract #</th>
                  <th className="px-4 py-2 text-start">Type</th>
                  <th className="px-4 py-2 text-start">End date</th>
                  <th className="px-4 py-2 text-start">Value</th>
                  <th className="px-4 py-2 text-start">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => {
                  const daysLeft = differenceInDays(c.endDate, new Date());
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{c.contractNumber}</td>
                      <td className="px-4 py-2.5 text-slate-800">{c.type}</td>
                      <td className="px-4 py-2.5 text-slate-600">{format(c.endDate, "dd MMM yyyy")}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {c.valueSar ? `SAR ${Number(c.valueSar).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {daysLeft < 0 ? (
                          <Badge tone="slate">Expired</Badge>
                        ) : daysLeft <= 30 ? (
                          <Badge tone="red">Expires in {daysLeft}d</Badge>
                        ) : daysLeft <= 90 ? (
                          <Badge tone="amber">Expires in {daysLeft}d</Badge>
                        ) : (
                          <Badge tone="green">Active</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No contracts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {canManageOrg(session.role) && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Add contract</h2>
            </CardHeader>
            <CardBody>
              <form action={createContract} className="space-y-4">
                <Field label="Contract number" htmlFor="contractNumber" required>
                  <Input id="contractNumber" name="contractNumber" required />
                </Field>
                <Field label="Type" htmlFor="type" required>
                  <Select id="type" name="type" required defaultValue="">
                    <option value="" disabled>Select type</option>
                    <option value="AMC">AMC</option>
                    <option value="FIRE">Fire Maintenance</option>
                    <option value="ELEVATOR">Elevator</option>
                    <option value="HVAC">HVAC</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="GENERATOR">Generator</option>
                    <option value="LANDSCAPING">Landscaping</option>
                    <option value="SECURITY">Security</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
                <Field label="Scope" htmlFor="scope">
                  <Input id="scope" name="scope" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start date" htmlFor="startDate" required>
                    <Input id="startDate" name="startDate" type="date" required />
                  </Field>
                  <Field label="End date" htmlFor="endDate" required>
                    <Input id="endDate" name="endDate" type="date" required />
                  </Field>
                </div>
                <Field label="Value (SAR)" htmlFor="valueSar">
                  <Input id="valueSar" name="valueSar" type="number" step="0.01" />
                </Field>
                <Button type="submit" className="w-full">
                  Add contract
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
