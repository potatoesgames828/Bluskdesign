"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "@/lib/utils";

const AXIS = { stroke: "rgb(var(--muted))", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid stroke="rgb(var(--line))" strokeOpacity={0.5} vertical={false} />;

function TooltipBox({ active, payload, label, currency }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; currency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-2xl">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} /><span className="text-muted">{p.name}:</span><span className="tabular-nums">{currency ? money(p.value) : p.value}</span></p>
      ))}
    </div>
  );
}

export interface Series { key: string; name: string; color: string }

export function TrendChart({ data, series, currency = true, height = 260, type = "area" }: { data: Record<string, string | number>[]; series: Series[]; currency?: boolean; height?: number; type?: "area" | "line" }) {
  const fmt = (v: number) => (currency ? money(v, { compact: true }) : String(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>{series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity={0.28} /><stop offset="100%" stopColor={s.color} stopOpacity={0} /></linearGradient>
          ))}</defs>
          {GRID}
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} tickFormatter={fmt} width={64} />
          <Tooltip content={<TooltipBox currency={currency} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "rgb(var(--muted))" }} />}
          {series.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#g-${s.key})`} />)}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} tickFormatter={fmt} width={64} allowDecimals={false} />
          <Tooltip content={<TooltipBox currency={currency} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, series, currency = true, height = 260, layout = "horizontal" }: { data: Record<string, string | number>[]; series: Series[]; currency?: boolean; height?: number; layout?: "horizontal" | "vertical" }) {
  const fmt = (v: number) => (currency ? money(v, { compact: true }) : String(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--line))" strokeOpacity={0.5} vertical={layout === "vertical"} horizontal={layout === "horizontal"} />
        {layout === "horizontal" ? <><XAxis dataKey="label" {...AXIS} minTickGap={8} /><YAxis {...AXIS} tickFormatter={fmt} width={64} allowDecimals={false} /></>
          : <><XAxis type="number" {...AXIS} tickFormatter={fmt} /><YAxis type="category" dataKey="label" {...AXIS} width={110} /></>}
        <Tooltip cursor={{ fill: "rgb(var(--elevated))", opacity: 0.6 }} content={<TooltipBox currency={currency} />} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={layout === "horizontal" ? [6, 6, 0, 0] : [0, 6, 6, 0]} maxBarSize={36} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, currency = false, height = 240 }: { data: { name: string; value: number; color: string }[]; currency?: boolean; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full max-w-[220px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TooltipBox currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="font-display text-xl font-bold">{currency ? money(total, { compact: true }) : total}</p><p className="text-[11px] text-muted">total</p></div>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />{d.name}</span>
            <span className="tabular-nums text-muted">{currency ? money(d.value) : d.value} · {total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const PALETTE = ["#3478F6", "#69A5FF", "#22C55E", "#F59E0B", "#A78BFA", "#06B6D4", "#EF4444", "#F472B6", "#929BAD"];
