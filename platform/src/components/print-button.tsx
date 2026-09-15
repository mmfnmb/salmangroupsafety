"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
