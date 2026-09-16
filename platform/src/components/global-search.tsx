"use client";

import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const searchParams = useSearchParams();

  return (
    <form action="/app/search" className="relative w-full max-w-sm">
      <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        name="q"
        placeholder="Search assets, requests, work orders…"
        defaultValue={searchParams.get("q") ?? ""}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 py-1.5 ps-9 pe-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </form>
  );
}
