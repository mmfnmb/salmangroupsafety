import { clsx } from "clsx";
import Link from "next/link";

const VARIANTS = {
  primary: "bg-blue-700 text-white shadow-sm hover:bg-blue-800 active:bg-blue-900",
  secondary: "bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 active:bg-slate-100",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
} as const;

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return <button className={clsx(base, VARIANTS[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(base, VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}
