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
| Vendor — Precision Cooling Solutions (HVAC/Refrigeration, Al Khobar/Dhahran) | `owner@precision-cooling.demo` |

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

## What's implemented (Phase 3 — managed procurement / RFQ)

- RFQ creation (`/app/rfq/new`) — from a maintenance request (pre-filled) or
  standalone, with site/asset, category, scope of work and a quote deadline.
  A facility manager can send any `NEW` request straight to vendors ("Send
  to vendors" on `/app/requests`) as the alternative to assigning an
  internal technician.
- Vendor invitation, filtered to approved, non-blacklisted vendors.
- Vendor-side quotation submission (`/vendor-portal/rfq`) — labor/materials/
  total price, lead time, warranty, payment terms, exclusions, validity.
- Quotation comparison (`/app/rfq/[id]`) with a real evaluation model, not a
  sort-by-price table: a quote must clear a minimum technical score
  (70/100, section 27) before it qualifies commercially; the cheapest
  *qualifying* quote scores 100 on price, others scale down proportionally;
  the recommended "best value" pick blends technical score, price
  competitiveness and the vendor's own track record — verified end-to-end
  with two competing demo quotes where the **more expensive, higher-quality
  quote was correctly recommended and awarded over the cheaper one**.
- Award workflow gated by value-based approval thresholds (reads
  `ApprovalThreshold` if the org has configured one, otherwise a sane
  default — owner approval above SAR 10,000) — **verified that a facility
  manager is blocked from awarding an SAR 11,000 contract** and only the
  account owner could complete it. Awarding creates the work order, closes
  out the RFQ, and automatically rejects the other quotations.
- Transparent platform fee (section 34's tiers, e.g. 8% on a SAR 5,000–25,000
  job) computed and displayed next to the contractor's own price at award
  time — informational only, nothing is charged or invoiced automatically,
  matching the "vendor invoices you directly, platform fee billed
  separately" model in section 35.

## What's implemented (Phase 5, partial — spare parts inventory)

- Org-scoped parts catalog (`/app/inventory`) — part number, brand,
  supplier, store location, unit cost, stock and minimum-stock levels, with
  low-stock rows highlighted and a one-field restock action.
- Parts consumption wired into the work order itself: log a part against a
  job either from inventory (decrements stock atomically inside a
  transaction, and is rejected if there isn't enough on hand) or as an
  ad-hoc line item for something not stocked.
- A real, computed "Low Stock Parts" count on the operations dashboard —
  verified end-to-end: added 2 units of a part to a work order, stock
  dropped from 12 to 10 in the database, and the usage line appeared
  against that job.

## What's implemented (Phase 5 — procurement)

- Purchase requests (`/app/procurement/new`) — any org member, technicians
  included, can request materials or a service. Requesting an item that
  matches an inventory `Part` triggers an automatic stock check: if there's
  enough on hand, the request is **fulfilled immediately** (stock
  decremented, no approval needed, logged straight onto the linked work
  order's parts list if there is one). Only when stock is insufficient does
  it wait for a supervisor.
- Supervisor approval converts a pending request into its own **Purchase
  Order** page (`/app/procurement/orders/[id]`) — a genuinely separate
  record and URL, not just a status flag.
- The purchase order suggests **specialized, nearby suppliers** by
  matching approved vendors on category and the site's coverage city (the
  same matching logic as the RFQ/work-order vendor assignment), showing
  their phone and email — the engineer picks one or enters a supplier
  manually.
- Marking an order **Supplied** closes the originating request, and — if it
  was for a tracked part — restocks inventory by the ordered quantity,
  closing the loop back into `/app/inventory`.
- Every step (create, approve/reject, order, supplied) writes an
  `AuditLog` entry; `/app/procurement` is the running archive of every
  request and order, fully documented.
- Verified end to end against the database: a part with 2 in stock and a
  5-unit request correctly required approval, matched the right category
  vendor by coverage city, and finished at 7 in stock after delivery.

## What's implemented (Phase 4 — AI Assistant, built and wired, pending activation)

The integration is real and complete — `src/lib/ai.ts` calls the actual
Anthropic Messages API — but this environment has no `ANTHROPIC_API_KEY`,
so every entry point shows an honest "pending activation" message instead
of a fabricated answer. Set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`)
and all three go live with no further code changes:

- **Request triage** — a "✨ AI suggestion" action on each new maintenance
  request (`/app/requests`) proposing category, priority, a safety-risk
  flag, and the trade needed, with reasoning.
- **Scope-of-work drafting** — "✨ Expand into full scope with AI" on
  `/app/rfq/new` turns a short problem description into a complete scope
  (inspection, repair, materials, testing, warranty, safety, exclusions)
  for a human to review before the RFQ is released.
- **Quotation recommendation narrative** — "✨ Explain this recommendation
  with AI" on an RFQ's comparison table explains in plain language why the
  best-value quote (always computed from real scores, never the model)
  was recommended.
- `/app/ai-assistant` is the overview screen — live status, what each
  capability does, and the AI safety rules that hold regardless of
  activation (advisory only; never auto-approves spending, awards a
  vendor, or overrides a human decision).

Verified end to end: all three entry points correctly show the
"pending activation" state (not a fake result) with `ANTHROPIC_API_KEY`
unset, which is this environment's real condition today.

## What's implemented (UI polish + remaining screens pass)

- **Redesigned sidebar** — `lucide-react` icons per item, active-route
  highlighting, items grouped into Operations / Assets / Workforce /
  Procurement / Intelligence / Admin, and the previously orphaned
  Checklists page and never-built Settings page are now reachable.
- **Redesigned topbar** — a real global search box, a notification bell,
  and a user menu (avatar, name, role, settings shortcut, log out),
  replacing the bare language switcher.
- **Global search** (`/app/search`) — queries assets, requests, work
  orders, sites and approved vendors by name/number/description, scoped
  to the signed-in organization.
- **Real notifications**, not a mocked bell: `Notification` rows are now
  actually written when an emergency/critical request comes in or a
  purchase request needs approval (both notify org managers), and the
  bell additionally shows live-computed alerts (overdue PM schedules,
  contracts expiring within 30 days) that need no background job because
  they're derived from current state on every load.
- **Maintenance request detail page** (`/app/requests/[id]`) — this was a
  real gap: `createInternalRequest` already redirected here and 404'd.
  Now shows the full request, requester info, AI triage, convert/reject
  actions, and links to the resulting work order or RFQ.
- **Settings screen** (`/app/settings`) — organization profile, per­
  priority SLA policies, approval thresholds (create/remove), and team
  management (invite with a generated one-time temporary password shown
  once, suspend/reactivate). Gated to Account Owner / Facility Manager /
  Maintenance Manager; other roles see it read-only.
- **Real charts** (`recharts`) on both dashboards, all from live queries —
  no placeholder data: a 14-day request trend and open-work-order status
  distribution on the Ops dashboard, a 6-month maintenance cost trend on
  the Executive dashboard, and a portfolio health sub-score breakdown
  (condition / PM compliance / reliability / open defects) on both.

Verified end to end with a real browser session (Playwright) against the
seeded `dammam-wh` org: login → dashboards render with live chart data →
notification bell shows a real PM-overdue alert → global search returns
real matches → a request's reference number opens its detail page →
settings page shows the actual seeded team and SLA policies → Arabic/RTL
toggle mirrors the new sidebar, topbar, search box and charts correctly.

## What's schema-ready but not yet built (documented, not faked)

File/photo upload to object storage (photo fields exist but there's no
upload backend wired up — noted inline in the UI where relevant), IoT
device integrations, ZATCA/e-invoicing, WhatsApp notifications, and a
public Open API.

## What's implemented (known-limitations pass)

- **Real photo upload** — a working `/api/upload` endpoint backed by local
  disk storage (`src/lib/storage.ts`), validated (image types only, 10MB
  cap, org/vendor-scoped folders). Wired into: checklist `PHOTO_REQUIRED`
  items, the public/QR "report a problem" form, and a new before/during/
  after photo gallery on the work order detail page (the `WorkOrderPhoto`
  model existed in the schema since Phase 1 but had no UI until now). This
  works out of the box for local dev and any self-hosted deployment; on a
  serverless platform (Vercel) the filesystem is ephemeral in production,
  so swap `saveUploadedImage()` for S3 / Vercel Blob / Supabase Storage
  before deploying there — every call site only depends on getting a URL
  back.
- **Monthly executive report rollup** — `WeeklyReport` gained a `period`
  column (`WEEKLY` | `MONTHLY`); the same report generator now produces
  either, and `/app/reports` has a "Generate monthly report" action
  alongside the weekly one.
- **Arabic translation, expanding outward from the highest-traffic
  screens**: the app chrome (sidebar/topbar), the Ops Dashboard, the
  public request-reporting form (shared by the QR-scan page and the org's
  public portal, with a language switcher on those public pages), and now
  the full **Operations** sidebar group — Requests (list, detail, and the
  internal "log a request" form), Work Orders (list and the full detail
  page: timeline, status flow, completion form, customer sign-off, parts,
  photos), Preventive Maintenance, and Checklists — are fully bilingual,
  including shared enum-label namespaces (`priority`, `requestStatus`,
  `workOrderStatus`, `workOrderType`, `assetCondition`, `slaStage`,
  `pmFrequency`) that later pages can reuse instead of re-translating the
  same badges. The remaining sidebar groups (Assets, Workforce,
  Procurement, Intelligence, Admin — roughly 25 pages) still use the same
  `next-intl` pattern established here but haven't been converted yet;
  left as follow-up work rather than claimed as done.

## Known limitations

- The PM→work-order cron (`/api/cron/pm`) needs `CRON_SECRET` set and the
  Vercel Cron trigger enabled at deploy time; it can also be triggered
  manually from `/app/pm`.
- Local-disk photo storage (see above) needs to be swapped for real object
  storage before a serverless production deploy.
- Assets, Workforce, Procurement, Intelligence and Admin screens are still
  English-only; RTL layout and the chrome around them is bilingual, their
  content isn't yet (Operations screens — requests, work orders, PM,
  checklists — are done, see above).

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

**RFQ / procurement flow:** two vendors invited to quote on the same job →
both submit competing prices → the facility manager scores each
technically → the system recommends the pricier, higher-quality quote over
the cheaper one (confirmed by the actual computed scores, 85 vs 83) → the
facility manager is correctly refused when trying to award it (over the
SAR 10,000 threshold) → the account owner awards it → a work order is
created and linked, the losing quotation is auto-rejected, an 8%/SAR 880
platform fee is computed and shown transparently, and the winning vendor
sees "AWARDED" on their own portal — all confirmed directly against the
database, not just the UI.

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
