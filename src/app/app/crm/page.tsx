"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDollarSign, KanbanSquare, Plus, Search, Target, Trophy, XCircle, Percent, BarChart3, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAGES, PRIORITIES, priorityLabel } from "@/lib/constants";
import type { Opportunity, Stage } from "@/lib/types";
import { PageHeader, StatCard, Badge, priorityTone, Skeleton, EmptyState } from "@/components/ui/Misc";
import { Button, buttonClass } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EntityFormModal } from "@/components/app/EntityForm";
import { useFeedback } from "@/components/ui/Feedback";
import { cn, errorMessage, money, pct, timeAgo } from "@/lib/utils";

export default function CrmPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useFeedback();
  const [items, setItems] = useState<Opportunity[] | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [sortBy, setSortBy] = useState<"position" | "value" | "last_interaction_at">("position");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [form, setForm] = useState<{ open: boolean; stage?: Stage }>({ open: false });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("opportunities").select("*").order("position").order("created_at", { ascending: false });
    if (error) toast(errorMessage(error), "error");
    setItems((data as Opportunity[]) ?? []);
  }, [supabase, toast]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return (items ?? []).filter((o) =>
      (!priority || o.priority === priority) &&
      (!t || [o.title, o.company, o.contact_name, o.owner, o.segment].some((x) => x?.toLowerCase().includes(t))));
  }, [items, search, priority]);

  const kpi = useMemo(() => {
    const all = items ?? [];
    const won = all.filter((o) => o.stage === "won");
    const lost = all.filter((o) => o.stage === "lost");
    const open = all.filter((o) => !["won", "lost"].includes(o.stage));
    const wonValue = won.reduce((a, o) => a + Number(o.value), 0);
    return {
      total: all.length,
      pipeline: open.reduce((a, o) => a + Number(o.value), 0),
      won: won.length, lost: lost.length,
      conversion: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
      avg: won.length ? wonValue / won.length : 0,
    };
  }, [items]);

  async function moveTo(id: string, stage: Stage) {
    const current = items?.find((o) => o.id === id);
    if (!current || current.stage === stage) return;
    const maxPos = Math.max(0, ...(items ?? []).filter((o) => o.stage === stage).map((o) => o.position));
    setItems((xs) => xs!.map((o) => (o.id === id ? { ...o, stage, position: maxPos + 1 } : o)));
    const { error } = await supabase.from("opportunities").update({ stage, position: maxPos + 1 }).eq("id", id);
    if (error) { toast(errorMessage(error), "error"); load(); return; }
    toast(`Movida para "${STAGES.find((s) => s.id === stage)?.label}".`);
    router.refresh();
  }

  const sorted = (list: Opportunity[]) => [...list].sort((a, b) =>
    sortBy === "value" ? Number(b.value) - Number(a.value) : sortBy === "last_interaction_at" ? b.last_interaction_at.localeCompare(a.last_interaction_at) : a.position - b.position);

  return (
    <>
      <PageHeader title="CRM" description="Pipeline comercial — arraste os cards entre as etapas."
        actions={<>
          <Link href="/app/oportunidades" className={buttonClass("secondary")}><Table2 className="h-4 w-4" />Tabela</Link>
          <Button onClick={() => setForm({ open: true })}><Plus className="h-4 w-4" />Nova oportunidade</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Oportunidades" value={kpi.total} icon={Target} />
        <StatCard label="Valor do pipeline" value={money(kpi.pipeline, { compact: true })} icon={CircleDollarSign} hint="Etapas abertas" />
        <StatCard label="Negócios fechados" value={kpi.won} icon={Trophy} tone="green" />
        <StatCard label="Negócios perdidos" value={kpi.lost} icon={XCircle} tone="red" />
        <StatCard label="Taxa de conversão" value={pct(kpi.conversion)} icon={Percent} tone="purple" hint="Fechados ÷ (fechados + perdidos)" />
        <StatCard label="Valor médio de venda" value={money(kpi.avg, { compact: true })} icon={BarChart3} tone="yellow" />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Filtrar oportunidades…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="sm:w-44">
          <option value="">Prioridade: todas</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="sm:w-52">
          <option value="position">Ordenar: manual</option>
          <option value="value">Ordenar: maior valor</option>
          <option value="last_interaction_at">Ordenar: interação recente</option>
        </Select>
      </div>

      {items === null ? (
        <div className="flex gap-4 overflow-hidden">{STAGES.slice(0, 4).map((s) => <Skeleton key={s.id} className="h-96 w-72 shrink-0 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="card"><EmptyState icon={KanbanSquare} title="Seu pipeline está vazio" description="Crie uma oportunidade ou envie um lead para o CRM a partir de Contatos ou do Blusk Hunter."
          action={<Button onClick={() => setForm({ open: true })}><Plus className="h-4 w-4" />Nova oportunidade</Button>} /></div>
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {STAGES.map((stage) => {
            const list = sorted(filtered.filter((o) => o.stage === stage.id));
            const total = list.reduce((a, o) => a + Number(o.value), 0);
            return (
              <section key={stage.id}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
                onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
                onDrop={(e) => { e.preventDefault(); setOverStage(null); if (dragId) moveTo(dragId, stage.id); setDragId(null); }}
                className={cn("flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border bg-surface/60 sm:w-72", overStage === stage.id ? "border-brand/60 bg-brand/5" : "border-line")}>
                <header className="flex items-center justify-between px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                    <span className="rounded-full bg-elevated px-1.5 text-[11px] text-muted">{list.length}</span>
                  </div>
                  <button onClick={() => setForm({ open: true, stage: stage.id })} className="rounded-md p-1 text-muted hover:bg-elevated hover:text-fg" aria-label={`Adicionar em ${stage.label}`}><Plus className="h-4 w-4" /></button>
                </header>
                <p className="px-3.5 pb-2 text-xs text-muted tabular-nums">{money(total)}</p>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2.5 pb-3">
                  {list.map((o) => (
                    <article key={o.id} draggable onDragStart={() => setDragId(o.id)} onDragEnd={() => setDragId(null)}
                      className={cn("group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card transition hover:border-brand/40 active:cursor-grabbing", dragId === o.id && "opacity-40")}>
                      <Link href={`/app/crm/${o.id}`} className="block">
                        <p className="text-[13.5px] font-medium leading-snug">{o.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{[o.company, o.contact_name].filter(Boolean).join(" · ") || "—"}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-sm font-semibold tabular-nums">{money(o.value)}</span>
                          <Badge tone={priorityTone(o.priority)}>{priorityLabel(o.priority)}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                          <span className="truncate">{o.segment ?? ""}{o.owner ? ` · ${o.owner}` : ""}</span>
                          <span>{timeAgo(o.last_interaction_at)}</span>
                        </div>
                      </Link>
                      <select aria-label="Mover para etapa" value={o.stage} onChange={(e) => moveTo(o.id, e.target.value as Stage)}
                        className="mt-2 w-full rounded-lg border border-line bg-bg px-2 py-1 text-xs text-muted lg:hidden">
                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <EntityFormModal entity="opportunity" open={form.open} onClose={() => setForm({ open: false })}
        initial={form.stage ? { stage: form.stage } : null} onSaved={() => { load(); router.refresh(); }} />
    </>
  );
}
