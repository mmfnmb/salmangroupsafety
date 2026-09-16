"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Settings, LogOut } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function UserMenu({
  name,
  roleLabel,
  onSignOut,
}: {
  name: string;
  roleLabel: string;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pe-1.5 ps-1 hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">
          {initials(name)}
        </span>
        <span className="hidden text-start sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-900">{name}</span>
          <span className="block text-xs leading-tight text-slate-500">{roleLabel}</span>
        </span>
        <ChevronDown size={15} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            href="/app/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Settings size={15} /> Settings
          </Link>
          <form action={onSignOut}>
            <button className="flex w-full items-center gap-2 px-3.5 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
