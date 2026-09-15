import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createCustomerLead, createVendorLead } from "@/server/leads";
import Link from "next/link";

const MODULES = [
  { title: "Asset Intelligence", body: "Digital passports, QR codes and full technical, commercial and warranty records for every asset you own." },
  { title: "Maintenance Operating System", body: "Requests, work orders, SLAs, preventive maintenance and digital checklists in one operational workflow." },
  { title: "Technician Performance", body: "A transparent, weighted score — response time, first-time fix rate, quality, safety and satisfaction." },
  { title: "Managed Vendor Marketplace", body: "When you don't have the right specialist, request quotes, compare best value and award with full audit trail." },
];

const INDUSTRIES = [
  "Factories & industrial facilities",
  "Warehouses & logistics centers",
  "Staff accommodation compounds",
  "Commercial buildings",
  "Clinics & medical centers",
  "Schools",
  "Retail chains",
  "Hotels",
];

export default async function LandingPage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceSar: "asc" } });

  return (
    <div className="bg-white text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <p className="text-lg font-bold">Maintain360</p>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#pricing" className="text-slate-600 hover:text-slate-900">Pricing</a>
          <a href="#demo" className="text-slate-600 hover:text-slate-900">Book a demo</a>
          <a href="#vendor" className="text-slate-600 hover:text-slate-900">Join as vendor</a>
          <Link href="/login" className="rounded-md bg-blue-700 px-3.5 py-2 font-medium text-white hover:bg-blue-800">
            Customer login
          </Link>
        </nav>
      </header>

      <section className="bg-slate-950 px-6 py-20 text-center text-white">
        <p className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Know every asset. Manage every job. Measure every technician. Control every contractor.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-slate-300">
          The Digital Maintenance Control Tower for Saudi businesses in the Eastern Province — Dammam, Al Khobar,
          Dhahran, Jubail, Qatif, Ras Tanura and Abqaiq.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#demo" className="rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500">
            Book a Demo
          </a>
          <a href="#vendor" className="rounded-md border border-white/30 px-5 py-3 font-medium text-white hover:bg-white/10">
            Join Our Maintenance Network
          </a>
        </div>
      </section>

      <section className="px-6 py-16">
        <h2 className="text-center text-2xl font-bold">We don&apos;t replace your maintenance team. We make sure it performs.</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Card key={m.title} className="p-6">
              <h3 className="font-semibold text-slate-900">{m.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{m.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16">
        <h2 className="text-center text-2xl font-bold">Built for these industries</h2>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
          {INDUSTRIES.map((i) => (
            <span key={i} className="rounded-full bg-white px-4 py-1.5 text-sm text-slate-700 shadow-sm">
              {i}
            </span>
          ))}
        </div>
      </section>

      <section id="pricing" className="px-6 py-16">
        <h2 className="text-center text-2xl font-bold">Pricing</h2>
        {plans.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">Plans are being finalized — contact us for pilot pricing.</p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <Card key={p.id} className="p-6">
                <h3 className="font-semibold text-slate-900">{p.nameEn}</h3>
                <p className="mt-2 text-2xl font-bold text-blue-700">SAR {Number(p.monthlyPriceSar).toLocaleString()}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {(p.features as string[]).map((f) => <li key={f}>• {f}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="demo" className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold">Book a Demo</h2>
          <Card className="mt-8 p-6">
            <form action={createCustomerLead} className="space-y-4">
              <Field label="Full name" htmlFor="name" required><Input id="name" name="name" required /></Field>
              <Field label="Company" htmlFor="company"><Input id="company" name="company" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobile" htmlFor="phone" required><Input id="phone" name="phone" type="tel" required /></Field>
                <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" htmlFor="city">
                  <Select id="city" name="city" defaultValue="">
                    <option value="">Select city</option>
                    <option>Dammam</option><option>Al Khobar</option><option>Dhahran</option>
                    <option>Jubail</option><option>Qatif</option><option>Ras Tanura</option><option>Abqaiq</option>
                  </Select>
                </Field>
                <Field label="Number of sites" htmlFor="siteCount"><Input id="siteCount" name="siteCount" type="number" min="1" /></Field>
              </div>
              <Field label="What's your main maintenance problem?" htmlFor="mainProblem">
                <Textarea id="mainProblem" name="mainProblem" rows={3} />
              </Field>
              <Button type="submit" className="w-full">Request a demo</Button>
            </form>
          </Card>
        </div>
      </section>

      <section id="vendor" className="px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold">Join Our Maintenance Network</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            For HVAC, electrical, fire safety, elevators, pumps and other specialist contractors in the Eastern Province.
          </p>
          <Card className="mt-8 p-6">
            <form action={createVendorLead} className="space-y-4">
              <Field label="Company name" htmlFor="name" required><Input id="name" name="name" required /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobile" htmlFor="phone" required><Input id="phone" name="phone" type="tel" required /></Field>
                <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" /></Field>
              </div>
              <Field label="City" htmlFor="city">
                <Select id="city" name="city" defaultValue="">
                  <option value="">Select city</option>
                  <option>Dammam</option><option>Al Khobar</option><option>Dhahran</option>
                  <option>Jubail</option><option>Qatif</option><option>Ras Tanura</option><option>Abqaiq</option>
                </Select>
              </Field>
              <Field label="Service categories" htmlFor="categories">
                <Input id="categories" name="categories" placeholder="e.g. HVAC, Electrical, Fire Alarm" />
              </Field>
              <Button type="submit" variant="secondary" className="w-full">Apply to join</Button>
            </form>
          </Card>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        Maintain360 — an independent digital maintenance management platform. Not affiliated with any existing
        internal facility system.
      </footer>
    </div>
  );
}
