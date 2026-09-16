import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("border-b border-slate-100 px-5 py-4", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

const TONE_STYLES = {
  slate: { text: "text-slate-900", iconBg: "bg-slate-100", iconText: "text-slate-600" },
  green: { text: "text-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
  amber: { text: "text-amber-600", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  red: { text: "text-red-600", iconBg: "bg-red-50", iconText: "text-red-600" },
  blue: { text: "text-blue-600", iconBg: "bg-blue-50", iconText: "text-blue-600" },
} as const;

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof TONE_STYLES;
  icon?: LucideIcon;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={clsx("mt-2 text-2xl font-semibold tabular-nums", styles.text)}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", styles.iconBg)}>
            <Icon className={styles.iconText} size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}
