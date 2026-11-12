import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-elevated text-muted border-line",
  blue: "bg-brand/10 text-brand-light border-brand/25",
  green: "bg-success/10 text-success border-success/25",
  yellow: "bg-warning/10 text-warning border-warning/25",
  red: "bg-danger/10 text-danger border-danger/25",
  purple: "bg-violet-500/10 text-violet-400 border-violet-500/25",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className, style }: { tone?: Tone; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <span style={style} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function ColorBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: `${color}40`, background: `${color}14` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function priorityTone(p: string): Tone {
  return p === "high" ? "red" : p === "medium" ? "yellow" : "neutral";
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-lg bg-elevated/70 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-elevated text-brand-light">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="grid place-items-center rounded-full bg-gradient-to-br from-brand to-brand-dark font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-elevated", className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-all duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = "blue" }: { label: string; value: ReactNode; icon: LucideIcon; hint?: ReactNode; tone?: "blue" | "green" | "red" | "yellow" | "purple" }) {
  const toneCls = { blue: "text-brand-light bg-brand/10", green: "text-success bg-success/10", red: "text-danger bg-danger/10", yellow: "text-warning bg-warning/10", purple: "text-violet-400 bg-violet-500/10" }[tone];
  return (
    <div className="card p-4 sm:p-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneCls)}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 font-display text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
