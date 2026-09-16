# Maintain360 — Saudi Digital Asset & Maintenance Management Platform

An independent, multi-tenant SaaS platform for asset management, maintenance
operations, technician performance and (in later phases) managed vendor
procurement — built for the Eastern Province of Saudi Arabia (Dammam, Al
Khobar, Dhahran, Jubail, Qatif, Ras Tanura, Abqaiq) and designed to scale
nationally.

**This is a completely separate product from the legacy
`safety_maintenance_v3.html` system in this repository.** It has its own
database, its own auth, its own environment variables and (at deploy time)
its own Vercel project. Nothing here touches the legacy file.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL (via
`@prisma/adapter-pg`) · Auth.js v5 (credentials) · next-intl (EN/AR + RTL) ·
Tailwind CSS v4.

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, CRON_SECRET
npx prisma migrate deploy   # apply schema
npx prisma db seed          # load Eastern Province demo data
npm run dev
```

Demo accounts (password `demo1234` for all):

| Role | Email |
|---|---|
| Platform admin | `admin@maintain360.demo` |
| Owner — Dammam Warehouse Facility | `owner@dammam-wh.demo` |
| Facility Manager — Dammam | `fm@dammam-wh.demo` |
| Owner — Jubail Manufacturing Plant | `owner@jubail-mfg.demo` |
| Owner — Khobar Medical Center | `owner@khobar-med.demo` |
| Vendor — Eastern Cool HVAC Services (HVAC/Refrigeration, Dammam/Khobar/Dhahran) | `owner@easterncool-hvac.demo` |
| Vendor — Gulf Safe Fire & Electrical (Fire/Electrical, Jubail/Dammam/Ras Tanura) | `owner@gulfsafe-fire.demo` |

Public entry points (no login required):
- `/` — marketing landing page, demo/vendor lead forms
- `/r/dammam-wh`, `/r/jubail-mfg`, `/r/khobar-med` — each org's public maintenance-request portal
- `/qr/<token>` — asset field passport + "report a problem" (open any asset from `/app/assets` to get its QR)
- `/join-network` — vendor registration (creates a PENDING vendor + login, reviewed by the platform admin at `/platform/vendors`)

## What's implemented (Phase 1 — commercial core)

- Multi-tenant auth & RBAC (platform / customer / vendor account types, 19 roles), with every data query scoped server-side by `orgId` — verified with a live cross-tenant access test (see below).
- Full asset hierarchy (Org → Site → Building → Floor → Room → System → Asset) with Digital Asset Passports, immutable asset codes, and per-asset QR codes.
- Maintenance request portal — public (QR + per-org link) and internal — issuing `REQ-YYYY-NNNNNN` references, with FM triage → convert-to-work-order.
- Work order engine — full status lifecycle, SLA policies with response/arrival/resolution timers and on-track/at-risk/breached evaluation, technician assignment, completion capture (root cause, corrective action, cost, safety flag), customer sign-off with 1–5 rating.
- Preventive maintenance — recurring PM plans, auto-generated schedules, a daily cron route (`/api/cron/pm`, wired in `vercel.json`) that converts due/overdue schedules into work orders, and a configurable digital checklist builder wired into the work-order completion flow.
- Technician passport + a transparent, weighted performance score (response time, SLA compliance, first-time-fix rate, repeat-failure avoidance, PM completion, repair quality, documentation, safety, satisfaction) computed live from real work-order data — never a placeholder number.
- Asset Health Score and Portfolio Health rollup (condition, PM compliance, breakdown frequency, open defects), computed the same way at both the asset and portfolio level.
- Operations dashboard, Executive Command Center (owner-only), and an auto-generated Executive Weekly Report (real computed metrics, printable).
- Contracts module with expiry alerts; a read-only vendor directory (vendor onboarding UI is Phase 2, see below).
- Bilingual EN/AR with a working language switcher and full RTL layout (logical Tailwind classes throughout, verified — no hardcoded left/right).
- Audit log on create/convert/award-type actions.

## What's implemented (Phase 2 — vendor network)

- Public vendor registration (`/join-network`) — company profile, CR/VAT,
  service categories, coverage cities, emergency availability — creates a
  `PENDING` `Vendor` + a `VENDOR_OWNER` login in one transaction.
- Platform admin console (`/platform`, `/platform/vendors`, `/platform/customers`,
  `/platform/leads`) with real counts (active customers, approved/pending
  vendors, active jobs, estimated MRR from actual plan pricing, vendor
  documents expiring within 30 days) and an approve/under-review/suspend/reject
  workflow for vendor applications.
- Vendor portal (`/vendor-portal`) — the vendor's own passport (categories,
  coverage, emergency availability), a document/certification list with
  expiry tracking, and their assigned jobs across every customer that has
  hired them, with accept/status actions scoped strictly to jobs assigned
  to that vendor.
- "Assign vendor" on a work order, alongside "assign internal technician" —
  a facility manager can hand a job to an approved, non-blacklisted vendor
  (filtered by coverage city) when no internal technician fits, without
  waiting for the RFQ module.
- Vendor performance scoring (`computeVendorPerformance`) using the
  section-27 weights — but **Technical Compliance and Price
  Competitiveness are reported as unavailable, not faked**, because they
  genuinely require RFQ/quotation evaluation data that doesn't exist until
  Phase 3. Historical Quality, Response Capability and Safety are computed
  live from real work-order/sign-off data and shown on the vendor portal
  and the customer-facing vendor directory (`/app/vendors`), which also
  gained live scores, city/category filters and a per-organization
  blacklist toggle.

## What's schema-ready but not yet built (documented, not faked)

The database schema already models Phase 3 concepts — `Rfq`, `RfqVendor`,
`Quotation`, `ApprovalThreshold` — so that phase won't require a schema
rewrite. RFQ creation, quote comparison and the award workflow are **not
built yet**.

Also not yet built: AI-assisted triage/scope-of-work/comparison (Phase 4),
file/photo upload to object storage (photo fields exist but there's no
upload backend wired up — noted inline in the UI where relevant), spare
parts inventory, ZATCA/e-invoicing, and WhatsApp notifications.

## Known limitations

- No object storage is configured, so "before/after photo" and "photo
  required" checklist fields accept a URL rather than a real file upload.
- The PM→work-order cron (`/api/cron/pm`) needs `CRON_SECRET` set and the
  Vercel Cron trigger enabled at deploy time; it can also be triggered
  manually from `/app/pm`.
- Only one weekly SLA/PM/finance report exists (the executive weekly
  report); a monthly rollup is not built.
- `next-intl` + RTL is wired end-to-end (app chrome, dashboards, landing
  page), but not every string in every form has an Arabic translation yet.

## Verified end-to-end (real browser test, not a claim)

**Customer/technician flow:** QR scan → report a problem → reference number
issued → appears in the facility manager's triage queue → converted to a
work order → technician assigned → status moved to In Progress →
completion form (root cause / corrective action) → status Completed, SLA
evaluated → customer sign-off (Approved, 5★) → status Closed → executive
weekly report regenerated and reflects the change. Also verified: an owner
from one seeded organization gets a 404 when requesting another
organization's asset ID directly.

**Vendor flow:** public registration at `/join-network` → login shows a
"pending" banner on the vendor portal → platform admin approves at
`/platform/vendors` → a facility manager assigns the now-approved vendor
to a work order from `/app/work-orders/[id]` → the vendor accepts the job
from their own portal → a previously-seeded, vendor-completed job with a
5★ sign-off produces a live vendor score of 100/100 on both the vendor's
own portal and the customer-facing directory.

## Environment variables

See `.env.example`. `DATABASE_URL` (Postgres), `AUTH_SECRET` (generate with
`openssl rand -base64 32`), `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`,
`CRON_SECRET`.

## Deploying

Create a **separate** Vercel project pointed at this `platform/` directory
with a **separate** managed Postgres database (e.g. a new Supabase/Neon
project — do not reuse any existing Salman Group database), set the env
vars above, run `npx prisma migrate deploy` against it, seed if you want
demo data, and enable the Vercel Cron in `vercel.json`.
