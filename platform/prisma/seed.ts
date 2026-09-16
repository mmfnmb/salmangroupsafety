import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { addDays, addMonths, subDays, subMonths } from "date-fns";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD_HASH = bcrypt.hashSync("demo1234", 10);

const SYSTEM_TYPES = [
  ["HVAC", "HVAC", "التكييف"],
  ["ELECTRICAL", "Electrical", "الكهرباء"],
  ["PLUMBING", "Plumbing", "السباكة"],
  ["FIRE_ALARM", "Fire Alarm", "إنذار الحريق"],
  ["FIRE_FIGHTING", "Fire Fighting", "مكافحة الحريق"],
  ["ELEVATORS", "Elevators", "المصاعد"],
  ["GENERATORS", "Generators", "المولدات"],
  ["PUMPS", "Pumps", "المضخات"],
  ["CCTV", "CCTV", "كاميرات المراقبة"],
  ["ACCESS_CONTROL", "Access Control", "التحكم بالدخول"],
  ["BMS", "BMS", "نظام إدارة المباني"],
  ["COMPRESSED_AIR", "Compressed Air", "الهواء المضغوط"],
  ["LIGHTING", "Lighting", "الإضاءة"],
  ["DOORS", "Doors", "الأبواب"],
  ["CIVIL", "Civil", "الأعمال المدنية"],
  ["LANDSCAPING", "Landscaping", "تنسيق الحدائق"],
  ["WATER_SYSTEMS", "Water Systems", "أنظمة المياه"],
] as const;

async function main() {
  console.log("Seeding platform reference data...");

  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { tier: "STARTER" },
      update: {},
      create: {
        tier: "STARTER",
        nameEn: "Starter",
        nameAr: "أساسي",
        monthlyPriceSar: 499,
        annualPriceSar: 4990,
        assetLimit: 100,
        userLimit: 5,
        siteLimit: 1,
        features: ["Asset register", "Maintenance requests", "QR codes", "Work orders"],
      },
    }),
    prisma.plan.upsert({
      where: { tier: "BUSINESS" },
      update: {},
      create: {
        tier: "BUSINESS",
        nameEn: "Business",
        nameAr: "أعمال",
        monthlyPriceSar: 1499,
        annualPriceSar: 14990,
        assetLimit: 1000,
        userLimit: 25,
        siteLimit: 5,
        features: ["Everything in Starter", "Preventive maintenance", "Technicians", "Reports", "Contracts"],
      },
    }),
    prisma.plan.upsert({
      where: { tier: "PROFESSIONAL" },
      update: {},
      create: {
        tier: "PROFESSIONAL",
        nameEn: "Professional",
        nameAr: "احترافي",
        monthlyPriceSar: 3499,
        annualPriceSar: 34990,
        assetLimit: 5000,
        userLimit: 100,
        siteLimit: 20,
        features: ["Everything in Business", "AI insights", "Vendor RFQ & procurement", "Executive reports"],
      },
    }),
    prisma.plan.upsert({
      where: { tier: "ENTERPRISE" },
      update: {},
      create: {
        tier: "ENTERPRISE",
        nameEn: "Enterprise",
        nameAr: "مؤسسي",
        monthlyPriceSar: 0,
        annualPriceSar: 0,
        assetLimit: null,
        userLimit: null,
        siteLimit: null,
        features: ["Everything in Professional", "Multi-site & API", "Custom workflows", "Dedicated support"],
      },
    }),
  ]);

  for (const [code, nameEn, nameAr] of SYSTEM_TYPES) {
    const existing = await prisma.assetSystemType.findFirst({ where: { orgId: null, code } });
    if (!existing) {
      await prisma.assetSystemType.create({ data: { orgId: null, code, nameEn, nameAr } });
    }
  }
  const systemTypes = await prisma.assetSystemType.findMany({ where: { orgId: null } });
  const sys = (code: string) => systemTypes.find((s) => s.code === code)!.id;

  // ── Demo organizations ────────────────────────────────────────────────
  const dammam = await prisma.organization.upsert({
    where: { slug: "dammam-wh" },
    update: {},
    create: {
      name: "Dammam Warehouse Facility",
      nameAr: "منشأة مستودعات الدمام",
      slug: "dammam-wh",
      industry: "WAREHOUSE_LOGISTICS",
      city: "Dammam",
      planId: plans[1].id,
      subscriptionStatus: "ACTIVE",
    },
  });
  const jubail = await prisma.organization.upsert({
    where: { slug: "jubail-mfg" },
    update: {},
    create: {
      name: "Jubail Light Manufacturing Plant",
      nameAr: "مصنع الجبيل للصناعات الخفيفة",
      slug: "jubail-mfg",
      industry: "MANUFACTURING",
      city: "Jubail",
      planId: plans[2].id,
      subscriptionStatus: "ACTIVE",
    },
  });
  const khobar = await prisma.organization.upsert({
    where: { slug: "khobar-med" },
    update: {},
    create: {
      name: "Khobar Medical Center",
      nameAr: "مركز الخبر الطبي",
      slug: "khobar-med",
      industry: "HEALTHCARE",
      city: "Al Khobar",
      planId: plans[1].id,
      subscriptionStatus: "TRIAL",
      trialEndsAt: addDays(new Date(), 14),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@maintain360.demo" },
    update: {},
    create: { email: "admin@maintain360.demo", passwordHash: DEMO_PASSWORD_HASH, name: "Platform Admin", role: "SUPER_ADMIN" },
  });

  const vendors = await seedVendors();

  for (const org of [dammam, jubail, khobar]) {
    await seedOrg(org, sys, vendors);
  }

  console.log("Seed complete.");
}

async function seedVendors() {
  const vendorDefs = [
    {
      email: "owner@easterncool-hvac.demo",
      name: "Eastern Cool HVAC Services",
      categories: ["HVAC", "Refrigeration"],
      coverageCities: ["Dammam", "Al Khobar", "Dhahran"],
    },
    {
      email: "owner@gulfsafe-fire.demo",
      name: "Gulf Safe Fire & Electrical",
      categories: ["Fire Alarm", "Fire Fighting", "Electrical"],
      coverageCities: ["Jubail", "Dammam", "Ras Tanura"],
    },
  ];

  const created = [];
  for (const def of vendorDefs) {
    const existingUser = await prisma.user.findUnique({ where: { email: def.email } });
    if (existingUser) {
      created.push(await prisma.vendor.findUniqueOrThrow({ where: { id: existingUser.vendorId! } }));
      continue;
    }
    const vendor = await prisma.vendor.create({
      data: {
        name: def.name,
        email: def.email,
        phone: "0138001234",
        crNumber: "CR-" + Math.floor(1000000 + Math.random() * 9000000),
        categories: def.categories,
        coverageCities: def.coverageCities,
        emergencyAvailable: true,
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: { email: def.email, passwordHash: DEMO_PASSWORD_HASH, name: `${def.name} — Owner`, role: "VENDOR_OWNER", vendorId: vendor.id },
    });
    created.push(vendor);
  }
  console.log(`Seeded ${created.length} approved demo vendors.`);
  return created;
}

async function seedOrg(
  org: { id: string; slug: string },
  sys: (code: string) => string,
  vendors: { id: string; name: string; categories: string[] }[]
) {
  const [owner, fm, supervisor] = await Promise.all([
    prisma.user.upsert({
      where: { email: `owner@${org.slug}.demo` },
      update: {},
      create: { email: `owner@${org.slug}.demo`, passwordHash: DEMO_PASSWORD_HASH, name: "Owner", role: "ACCOUNT_OWNER", orgId: org.id },
    }),
    prisma.user.upsert({
      where: { email: `fm@${org.slug}.demo` },
      update: {},
      create: { email: `fm@${org.slug}.demo`, passwordHash: DEMO_PASSWORD_HASH, name: "Facility Manager", role: "FACILITY_MANAGER", orgId: org.id },
    }),
    prisma.user.upsert({
      where: { email: `supervisor@${org.slug}.demo` },
      update: {},
      create: { email: `supervisor@${org.slug}.demo`, passwordHash: DEMO_PASSWORD_HASH, name: "Maintenance Supervisor", role: "MAINTENANCE_SUPERVISOR", orgId: org.id },
    }),
  ]);
  void owner;
  void fm;
  void supervisor;

  const site = await prisma.site.upsert({
    where: { orgId_code: { orgId: org.id, code: `${org.slug.split("-")[0].slice(0, 3).toUpperCase()}01` } },
    update: {},
    create: {
      orgId: org.id,
      code: `${org.slug.split("-")[0].slice(0, 3).toUpperCase()}01`,
      name: "Main Facility",
      city: org.slug.includes("dammam") ? "Dammam" : org.slug.includes("jubail") ? "Jubail" : "Al Khobar",
    },
  });

  const buildingA = await prisma.building.create({ data: { siteId: site.id, name: "Building A" } });

  // SLA policies
  await Promise.all(
    (["CRITICAL", "EMERGENCY", "HIGH", "NORMAL", "LOW"] as const).map((priority, i) =>
      prisma.slaPolicy.upsert({
        where: { orgId_priority: { orgId: org.id, priority } },
        update: {},
        create: {
          orgId: org.id,
          priority,
          name: `${priority} SLA`,
          responseMinutes: [15, 30, 120, 480, 1440][i],
          arrivalMinutes: [30, 60, 180, 720, 2880][i],
          resolutionMinutes: [240, 480, 1440, 4320, 10080][i],
        },
      })
    )
  );

  const checklist = await prisma.checklist.create({
    data: {
      orgId: org.id,
      name: "Monthly HVAC Inspection",
      items: [
        { id: "item-1", label: "Check refrigerant pressure", type: "PASS_FAIL", required: true },
        { id: "item-2", label: "Inspect and clean filters", type: "PASS_FAIL", required: true },
        { id: "item-3", label: "Test thermostat calibration", type: "YES_NO", required: true },
        { id: "item-4", label: "Record supply air temperature (°C)", type: "NUMERIC", required: false },
      ],
    },
  });

  const technicianUsers = await Promise.all(
    ["Ahmed Al-Otaibi", "Mohammed Al-Harbi"].map((name, i) =>
      prisma.user.create({
        data: {
          email: `tech${i + 1}@${org.slug}.demo`,
          passwordHash: DEMO_PASSWORD_HASH,
          name,
          role: "TECHNICIAN",
          orgId: org.id,
        },
      })
    )
  );

  const technicians = await Promise.all(
    technicianUsers.map((u, i) =>
      prisma.technician.create({
        data: {
          orgId: org.id,
          userId: u.id,
          name: u.name,
          trade: i === 0 ? "HVAC Technician" : "Electrical Technician",
          employeeId: `EMP-${1000 + i}`,
          phone: `05${10000000 + i}`,
          email: u.email,
          sites: { create: [{ siteId: site.id }] },
        },
      })
    )
  );

  // ── Assets ───────────────────────────────────────────────────────────
  const assetDefs = [
    { name: "Split AC Unit 1", nameAr: "مكيف سبليت 1", type: "Split AC", sys: "HVAC", criticality: "MEDIUM" as const },
    { name: "Chiller Pump 1", nameAr: "مضخة تبريد 1", type: "Centrifugal Pump", sys: "PUMPS", criticality: "HIGH" as const },
    { name: "Main Distribution Board", nameAr: "لوحة التوزيع الرئيسية", type: "MDB", sys: "ELECTRICAL", criticality: "CRITICAL" as const },
    { name: "Fire Alarm Panel", nameAr: "لوحة إنذار الحريق", type: "Addressable Panel", sys: "FIRE_ALARM", criticality: "CRITICAL" as const },
    { name: "Fire Pump Set", nameAr: "مجموعة مضخة الحريق", type: "Diesel Fire Pump", sys: "FIRE_FIGHTING", criticality: "CRITICAL" as const },
    { name: "Standby Generator", nameAr: "المولد الاحتياطي", type: "Diesel Generator", sys: "GENERATORS", criticality: "HIGH" as const },
    { name: "CCTV NVR System", nameAr: "نظام كاميرات المراقبة", type: "NVR", sys: "CCTV", criticality: "LOW" as const },
    { name: "Loading Bay Roller Shutter", nameAr: "باب الشحن الدوار", type: "Roller Shutter", sys: "DOORS", criticality: "MEDIUM" as const },
    { name: "Domestic Water Tank", nameAr: "خزان المياه", type: "GRP Tank", sys: "WATER_SYSTEMS", criticality: "MEDIUM" as const },
    { name: "Passenger Elevator", nameAr: "المصعد", type: "Traction Elevator", sys: "ELEVATORS", criticality: "HIGH" as const },
  ];

  const assets = [];
  for (let i = 0; i < assetDefs.length; i++) {
    const d = assetDefs[i];
    const assetCode = `${site.code}-A-${d.sys}-${String(i + 1).padStart(3, "0")}`;
    const asset = await prisma.asset.create({
      data: {
        orgId: org.id,
        siteId: site.id,
        buildingId: buildingA.id,
        systemTypeId: sys(d.sys),
        assetCode,
        name: d.name,
        nameAr: d.nameAr,
        type: d.type,
        manufacturer: ["Carrier", "Grundfos", "Schneider Electric", "Honeywell", "Caterpillar"][i % 5],
        criticality: d.criticality,
        condition: i % 7 === 0 ? "POOR" : i % 4 === 0 ? "FAIR" : "GOOD",
        status: "OPERATIONAL",
        purchaseDate: subMonths(new Date(), 18 + i * 3),
        installationDate: subMonths(new Date(), 17 + i * 3),
        commissioningDate: subMonths(new Date(), 17 + i * 3),
        usefulLifeYears: [10, 15, 20, 15, 12, 15, 7, 15, 10, 20][i],
        purchasePriceSar: [8000, 25000, 45000, 15000, 60000, 90000, 12000, 20000, 18000, 350000][i],
        replacementCostSar: [9500, 28000, 52000, 17000, 70000, 105000, 14000, 23000, 21000, 400000][i],
        warrantyStart: subMonths(new Date(), 17 + i * 3),
        warrantyEnd: addMonths(new Date(), 6 - i),
        warrantyProvider: "Original Equipment Manufacturer",
      },
    });
    assets.push(asset);
  }

  // PM plan on the HVAC asset with the checklist
  const pmPlan = await prisma.pMPlan.create({
    data: {
      orgId: org.id,
      assetId: assets[0].id,
      name: "Monthly HVAC PM",
      frequency: "MONTHLY",
      intervalValue: 1,
      checklistId: checklist.id,
      assignedTechnicianId: technicians[0].id,
      estimatedDurationMinutes: 60,
      instructions: "Follow manufacturer PM checklist. Isolate power before servicing.",
    },
  });
  const pmSchedules = await Promise.all(
    [subDays(new Date(), 30), new Date(), addDays(new Date(), 30)].map((dueDate, i) =>
      prisma.pMSchedule.create({
        data: { pmPlanId: pmPlan.id, dueDate, status: i === 0 ? "COMPLETED" : i === 1 ? "DUE" : "UPCOMING" },
      })
    )
  );

  // ── Requests + Work orders (demo maintenance history) ──────────────────
  let reqSeq = 1;
  let woSeq = 1;
  const year = new Date().getFullYear();
  const nextRef = () => `REQ-${year}-${String(reqSeq++).padStart(6, "0")}`;
  const nextWo = () => `WO-${year}-${String(woSeq++).padStart(6, "0")}`;

  // 1) Closed corrective job with full history + rating
  const req1 = await prisma.maintenanceRequest.create({
    data: {
      orgId: org.id,
      referenceNumber: nextRef(),
      siteId: site.id,
      assetId: assets[1].id,
      requesterName: "Facility Manager",
      description: "Chiller pump making unusual noise and vibration.",
      priority: "HIGH",
      status: "CONVERTED",
      source: "INTERNAL_PORTAL",
      createdAt: subDays(new Date(), 20),
    },
  });
  await prisma.workOrder.create({
    data: {
      orgId: org.id,
      number: nextWo(),
      requestId: req1.id,
      siteId: site.id,
      assetId: assets[1].id,
      type: "CORRECTIVE",
      category: "Pumps",
      priority: "HIGH",
      description: "Chiller pump making unusual noise and vibration.",
      assignedTechnicianId: technicians[0].id,
      status: "CLOSED",
      createdAt: subDays(new Date(), 20),
      respondedAt: subDays(new Date(), 20),
      arrivedAt: subDays(new Date(), 20),
      startedAt: subDays(new Date(), 19),
      completedAt: subDays(new Date(), 19),
      closedAt: subDays(new Date(), 18),
      rootCause: "Worn bearing causing vibration.",
      correctiveAction: "Replaced bearing and realigned coupling.",
      recommendation: "Add to quarterly vibration monitoring.",
      laborCostSar: 350,
      partsCostSar: 420,
      totalCostSar: 770,
      customerSignoffAt: subDays(new Date(), 18),
      customerSignoffStatus: "APPROVED",
      customerRating: 5,
    },
  });

  // 2) Open emergency work order (drives dashboard "critical" numbers)
  const req2 = await prisma.maintenanceRequest.create({
    data: {
      orgId: org.id,
      referenceNumber: nextRef(),
      siteId: site.id,
      assetId: assets[3].id,
      requesterName: "Night Security Guard",
      requesterPhone: "0551234567",
      description: "Fire alarm panel showing fault light, zone 3 unresponsive.",
      priority: "CRITICAL",
      status: "CONVERTED",
      source: "QR_SCAN",
      createdAt: subDays(new Date(), 1),
    },
  });
  await prisma.workOrder.create({
    data: {
      orgId: org.id,
      number: nextWo(),
      requestId: req2.id,
      siteId: site.id,
      assetId: assets[3].id,
      type: "EMERGENCY",
      category: "Fire Alarm",
      priority: "CRITICAL",
      description: "Fire alarm panel showing fault light, zone 3 unresponsive.",
      assignedTechnicianId: technicians[1].id,
      status: "DIAGNOSIS",
      createdAt: subDays(new Date(), 1),
      respondedAt: subDays(new Date(), 1),
    },
  });

  // 3) New unconverted request (shows up in triage queue)
  await prisma.maintenanceRequest.create({
    data: {
      orgId: org.id,
      referenceNumber: nextRef(),
      siteId: site.id,
      assetId: assets[6].id,
      requesterName: "Warehouse Staff",
      requesterPhone: "0559876543",
      description: "CCTV camera near loading bay showing no signal.",
      priority: "NORMAL",
      status: "NEW",
      source: "PUBLIC_PORTAL",
      createdAt: subDays(new Date(), 0.5),
    },
  });

  // 4) Completed PM work order tied to the PM schedule + checklist response
  const pmWo = await prisma.workOrder.create({
    data: {
      orgId: org.id,
      siteId: site.id,
      assetId: assets[0].id,
      number: nextWo(),
      type: "PREVENTIVE",
      category: "Preventive Maintenance",
      priority: "NORMAL",
      description: `Scheduled PM: ${pmPlan.name}`,
      assignedTechnicianId: technicians[0].id,
      pmScheduleId: pmSchedules[0].id,
      status: "CLOSED",
      createdAt: subDays(new Date(), 32),
      respondedAt: subDays(new Date(), 31),
      arrivedAt: subDays(new Date(), 30),
      startedAt: subDays(new Date(), 30),
      completedAt: subDays(new Date(), 30),
      closedAt: subDays(new Date(), 29),
      rootCause: null,
      correctiveAction: "Routine PM completed, filters replaced.",
      customerSignoffAt: subDays(new Date(), 29),
      customerSignoffStatus: "APPROVED",
      customerRating: 4,
    },
  });
  await prisma.checklistResponse.create({
    data: {
      workOrderId: pmWo.id,
      checklistId: checklist.id,
      responses: { "item-1": "PASS", "item-2": "PASS", "item-3": "YES", "item-4": "18" },
      submittedAt: subDays(new Date(), 30),
    },
  });

  // 5) For the manufacturing plant only: no internal technician for this trade,
  // so the job goes to an external vendor — the platform's core marketplace story.
  if (org.slug === "jubail-mfg") {
    const fireVendor = vendors.find((v) => v.categories.includes("Fire Fighting"));
    if (fireVendor) {
      const req5 = await prisma.maintenanceRequest.create({
        data: {
          orgId: org.id,
          referenceNumber: nextRef(),
          siteId: site.id,
          assetId: assets[4].id,
          requesterName: "Facility Manager",
          description: "Fire pump set failed weekly test run, needs specialist diagnosis.",
          priority: "HIGH",
          status: "CONVERTED",
          source: "INTERNAL_PORTAL",
          createdAt: subDays(new Date(), 10),
        },
      });
      await prisma.workOrder.create({
        data: {
          orgId: org.id,
          number: nextWo(),
          requestId: req5.id,
          siteId: site.id,
          assetId: assets[4].id,
          type: "CORRECTIVE",
          category: "Fire Fighting",
          priority: "HIGH",
          description: "Fire pump set failed weekly test run, needs specialist diagnosis.",
          assignedVendorId: fireVendor.id,
          status: "CLOSED",
          createdAt: subDays(new Date(), 10),
          respondedAt: subDays(new Date(), 10),
          arrivedAt: subDays(new Date(), 9),
          startedAt: subDays(new Date(), 9),
          completedAt: subDays(new Date(), 8),
          closedAt: subDays(new Date(), 7),
          rootCause: "Jockey pump pressure switch failure.",
          correctiveAction: "Replaced pressure switch, re-tested full run cycle.",
          recommendation: "Add switch to next annual PM checklist.",
          customerSignoffAt: subDays(new Date(), 7),
          customerSignoffStatus: "APPROVED",
          customerRating: 5,
        },
      });
    }
  }

  console.log(`Seeded ${org.id} with ${assets.length} assets, 2 technicians, 4 requests/work orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
