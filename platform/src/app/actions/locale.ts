"use server";

import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/request";

export async function setLocale(locale: AppLocale) {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
