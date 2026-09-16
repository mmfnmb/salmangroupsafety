import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { registerVendor } from "@/server/vendors";

const CATEGORIES = [
  "HVAC", "Refrigeration", "Electrical", "Low Current", "Fire Alarm", "Fire Fighting",
  "Pumps", "Plumbing", "Generators", "Elevators", "CCTV", "Access Control", "BMS",
  "Civil", "Waterproofing", "Doors", "Roller Shutters", "Cleaning", "Pest Control",
  "Landscaping", "Water Tanks", "Diesel Systems", "Compressed Air", "Kitchen Equipment",
  "Specialist Industrial Maintenance",
];

const CITIES = ["Dammam", "Al Khobar", "Dhahran", "Jubail", "Qatif", "Ras Tanura", "Abqaiq"];

export default function JoinNetworkPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Join Our Maintenance Network</h1>
      <p className="mt-1 text-sm text-slate-500">
        Register your company to receive job opportunities from Maintain360 customers in the Eastern Province.
        Your application will be reviewed before you can quote or accept jobs.
      </p>

      <Card className="mt-8 p-6">
        <form action={registerVendor} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company name (English)" htmlFor="name" required>
              <Input id="name" name="name" required />
            </Field>
            <Field label="Company name (Arabic)" htmlFor="nameAr">
              <Input id="nameAr" name="nameAr" dir="rtl" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CR number" htmlFor="crNumber">
              <Input id="crNumber" name="crNumber" />
            </Field>
            <Field label="VAT number" htmlFor="vatNumber">
              <Input id="vatNumber" name="vatNumber" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mobile" htmlFor="phone" required>
              <Input id="phone" name="phone" type="tel" required />
            </Field>
            <Field label="Website" htmlFor="website">
              <Input id="website" name="website" type="url" />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Service categories</p>
            <div className="grid grid-cols-3 gap-1.5 text-sm text-slate-600">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input type="checkbox" name="categories" value={c} /> {c}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Coverage areas</p>
            <div className="grid grid-cols-3 gap-1.5 text-sm text-slate-600">
              {CITIES.map((c) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input type="checkbox" name="coverageCities" value={c} /> {c}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="emergencyAvailable" /> We offer 24/7 emergency callout
          </label>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <Field label="Login email" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input id="password" name="password" type="password" required minLength={8} />
            </Field>
          </div>

          <Button type="submit" className="w-full">Submit application</Button>
        </form>
      </Card>
    </div>
  );
}
