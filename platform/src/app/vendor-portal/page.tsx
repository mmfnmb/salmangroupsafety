import { requireVendorSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { computeVendorPerformance } from "@/lib/scoring";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateVendorProfile, addVendorDocument, vendorUpdateJobStatus } from "@/server/vendors";
import { subDays, format, differenceInDays } from "date-fns";

const CATEGORIES = [
  "HVAC", "Refrigeration", "Electrical", "Low Current", "Fire Alarm", "Fire Fighting",
  "Pumps", "Plumbing", "Generators", "Elevators", "CCTV", "Access Control", "BMS",
  "Civil", "Waterproofing", "Doors", "Roller Shutters", "Cleaning", "Pest Control",
  "Landscaping", "Water Tanks", "Diesel Systems", "Compressed Air", "Kitchen Equipment",
  "Specialist Industrial Maintenance",
];
const CITIES = ["Dammam", "Al Khobar", "Dhahran", "Jubail", "Qatif", "Ras Tanura", "Abqaiq"];

export default async function VendorPortalPage() {
  const session = await requireVendorSession();

  const [vendor, jobs, score] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: session.vendorId }, include: { documents: true } }),
    prisma.workOrder.findMany({
      where: { assignedVendorId: session.vendorId },
      include: { site: true, organization: true, asset: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    computeVendorPerformance(session.vendorId, subDays(new Date(), 90), new Date()),
  ]);

  return (
    <div className="space-y-6">
      {vendor.status !== "APPROVED" && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Your application is <strong>{vendor.status.replace("_", " ").toLowerCase()}</strong>. You can complete
            your profile and upload documents now — job assignments unlock once approved.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-slate-900">Company profile</h2></CardHeader>
            <CardBody>
              <form action={updateVendorProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name (Arabic)" htmlFor="nameAr">
                    <Input id="nameAr" name="nameAr" dir="rtl" defaultValue={vendor.nameAr ?? ""} />
                  </Field>
                  <Field label="Website" htmlFor="website">
                    <Input id="website" name="website" type="url" defaultValue={vendor.website ?? ""} />
                  </Field>
                </div>
                <Field label="Address" htmlFor="address">
                  <Input id="address" name="address" defaultValue={vendor.address ?? ""} />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Service categories</p>
                  <div className="grid grid-cols-3 gap-1.5 text-sm text-slate-600">
                    {CATEGORIES.map((c) => (
                      <label key={c} className="flex items-center gap-1.5">
                        <input type="checkbox" name="categories" value={c} defaultChecked={vendor.categories.includes(c)} /> {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Coverage areas</p>
                  <div className="grid grid-cols-3 gap-1.5 text-sm text-slate-600">
                    {CITIES.map((c) => (
                      <label key={c} className="flex items-center gap-1.5">
                        <input type="checkbox" name="coverageCities" value={c} defaultChecked={vendor.coverageCities.includes(c)} /> {c}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="emergencyAvailable" defaultChecked={vendor.emergencyAvailable} /> 24/7 emergency callout
                </label>
                <Button type="submit">Save profile</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-slate-900">Assigned jobs</h2></CardHeader>
            <div className="divide-y divide-slate-100">
              {jobs.map((wo) => {
                const canAccept = wo.status === "ASSIGNED";
                const acceptAction = vendorUpdateJobStatus.bind(null, wo.id, "ACCEPTED");
                return (
                  <div key={wo.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{wo.number} · {wo.organization.name}</p>
                      <p className="text-sm text-slate-800">{wo.description}</p>
                      <p className="text-xs text-slate-500">{wo.site.name}{wo.asset ? ` · ${wo.asset.assetCode}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{wo.status.replace(/_/g, " ")}</Badge>
                      {canAccept && (
                        <form action={acceptAction}>
                          <Button type="submit" className="px-2 py-1 text-xs">Accept</Button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
              {jobs.length === 0 && <p className="p-5 text-sm text-slate-500">No jobs assigned yet.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-slate-900">Documents & certifications</h2></CardHeader>
            <div className="divide-y divide-slate-100">
              {vendor.documents.map((d) => {
                const expiringSoon = d.expiryDate && differenceInDays(d.expiryDate, new Date()) <= 30;
                return (
                  <div key={d.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span>{d.name} <span className="text-xs text-slate-400">({d.type})</span></span>
                    {d.expiryDate && (
                      <Badge tone={expiringSoon ? "red" : "slate"}>Expires {format(d.expiryDate, "dd MMM yyyy")}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <CardBody>
              <form action={addVendorDocument} className="grid grid-cols-2 gap-3">
                <Input name="name" placeholder="Document name" required />
                <Select name="type" defaultValue="OTHER">
                  <option value="CR">Commercial Registration</option>
                  <option value="VAT">VAT Certificate</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="CERTIFICATE">Professional Certificate</option>
                  <option value="OTHER">Other</option>
                </Select>
                <Input name="url" type="url" placeholder="Document URL" required className="col-span-2" />
                <Input name="expiryDate" type="date" placeholder="Expiry date" />
                <Button type="submit" variant="secondary">Add document</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-900">Performance (last 90 days)</h2></CardHeader>
          <CardBody>
            {score.overallScore != null ? (
              <>
                <p className="text-4xl font-bold text-blue-700">{score.overallScore}</p>
                <p className="text-xs text-slate-500">{score.jobsCompleted} jobs completed</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No completed jobs yet to score.</p>
            )}
            <p className="mt-4 text-xs text-slate-400">
              Technical compliance, price competitiveness and warranty scoring activate once the RFQ/quotation
              module is live for this platform.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
