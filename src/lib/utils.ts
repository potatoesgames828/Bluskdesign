import clsx, { type ClassValue } from "clsx";
import type { Preferences } from "./types";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

let prefs: Preferences = { locale: "pt-BR", currency: "BRL" };
export function setFormatPrefs(p: Preferences) {
  prefs = { ...prefs, ...p };
}

export function money(v: number | string | null | undefined, opts?: { compact?: boolean }) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat(prefs.locale ?? "pt-BR", {
    style: "currency",
    currency: prefs.currency ?? "BRL",
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function num(v: number) {
  return new Intl.NumberFormat(prefs.locale ?? "pt-BR").format(v);
}

export function pct(v: number) {
  return `${(Number.isFinite(v) ? v : 0).toFixed(1).replace(".", ",")}%`;
}

/** Interpreta 'YYYY-MM-DD' como data local (evita deslocamento de fuso). */
export function parseDate(d: string | Date) {
  if (d instanceof Date) return d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

export function date(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(prefs.locale ?? "pt-BR", opts).format(parseDate(d));
}

export function dateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(prefs.locale ?? "pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
  return date(d);
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "B";
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  let d = onlyDigits(phone);
  if (!d) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Ocorreu um erro inesperado.";
}

export type PeriodKey = "today" | "7d" | "30d" | "90d" | "year" | "custom";
export const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "year", label: "Este ano" },
  { id: "custom", label: "Personalizado" },
];

export function resolvePeriod(p?: string, from?: string, to?: string): { key: PeriodKey; from: string; to: string } {
  const today = new Date();
  const end = toISODate(today);
  const back = (days: number) => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
  switch (p) {
    case "today": return { key: "today", from: end, to: end };
    case "7d": return { key: "7d", from: back(6), to: end };
    case "90d": return { key: "90d", from: back(89), to: end };
    case "year": return { key: "year", from: `${today.getFullYear()}-01-01`, to: end };
    case "custom":
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to))
        return { key: "custom", from: from <= to ? from : to, to: from <= to ? to : from };
      return { key: "30d", from: back(29), to: end };
    default: return { key: "30d", from: back(29), to: end };
  }
}

/** Gera buckets (dia ou mês) entre duas datas ISO. */
export function buckets(from: string, to: string) {
  const a = parseDate(from), b = parseDate(to);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  const monthly = days > 62;
  const out: { key: string; label: string }[] = [];
  if (monthly) {
    const c = new Date(a.getFullYear(), a.getMonth(), 1);
    while (c <= b) {
      out.push({ key: toISODate(c).slice(0, 7), label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(c) });
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    const c = new Date(a);
    while (c <= b) {
      out.push({ key: toISODate(c), label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(c) });
      c.setDate(c.getDate() + 1);
    }
  }
  return { monthly, list: out, bucketOf: (iso: string) => (monthly ? iso.slice(0, 7) : iso.slice(0, 10)) };
}
