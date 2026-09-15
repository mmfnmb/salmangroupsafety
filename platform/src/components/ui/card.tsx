import { clsx } from "clsx";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("border-b border-slate-100 px-5 py-4", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const toneMap = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  } as const;
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={clsx("mt-2 text-2xl font-semibold", toneMap[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
