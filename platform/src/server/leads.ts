"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createCustomerLead(formData: FormData) {
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  if (!name || !phone) throw new Error("Name and phone are required");

  await prisma.lead.create({
    data: {
      type: "CUSTOMER",
      name,
      phone,
      company: str(formData, "company"),
      email: str(formData, "email"),
      city: str(formData, "city"),
      industry: str(formData, "industry"),
      siteCount: str(formData, "siteCount") ? Number(str(formData, "siteCount")) : null,
      estimatedAssets: str(formData, "estimatedAssets") ? Number(str(formData, "estimatedAssets")) : null,
      teamSize: str(formData, "teamSize") ? Number(str(formData, "teamSize")) : null,
      mainProblem: str(formData, "mainProblem"),
    },
  });

  redirect("/thank-you");
}
