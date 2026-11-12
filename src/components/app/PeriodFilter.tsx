"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { PERIODS, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function PeriodFilter({ current, from, to }: { current: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [custom, setCustom] = useState({ from, to });
  const [showCustom, setShowCustom] = useState(current === "custom");
  const go = (p: string, extra?: Record<string, string>) => {
    const q = new URLSearchParams(sp.toString());
    q.set("p", p);
    q.delete("from"); q.delete("to");
    Object.entries(extra ?? {}).forEach(([k, v]) => q.set(k, v));
    router.push(`${pathname}?${q.toString()}`);
  };
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => (p.id === "custom" ? setShowCustom(true) : (setShowCustom(false), go(p.id)))}
            className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition", (current === p.id && !(showCustom && p.id !== "custom")) || (showCustom && p.id === "custom") ? "bg-brand text-white" : "text-muted hover:text-fg")}>
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input type="date" className="input h-9 py-1 text-xs" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Data inicial" />
          <span className="text-xs text-muted">até</span>
          <input type="date" className="input h-9 py-1 text-xs" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Data final" />
          <Button size="sm" onClick={() => go("custom", custom)}>Aplicar</Button>
        </div>
      )}
    </div>
  );
}
