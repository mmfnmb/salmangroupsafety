import { clsx } from "clsx";

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-600/10",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/15",
} as const;

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
