"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, FolderKanban, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROJECT_STATUSES, projectStatusLabel } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { PageHeader, ColorBadge, Progress, Skeleton, EmptyState, Card } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EntityFormModal } from "@/components/app/EntityForm";
import { date, money } from "@/lib/utils";
import { projectAlerts } from "@/lib/projects";

type P = Project & { clients: { name: string } | null; project_tasks: { done: boolean }[] };

export default function ProjectsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<P[] | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*, clients(name), project_tasks(done)").order("created_at", { ascending: false });
    setItems((data as P[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (items ?? []).filter((p) => (!status || p.status === status) &&
    (!search || [p.name, p.clients?.name, p.category, p.owner].some((x) => x?.toLowerCase().includes(search.toLowerCase())))), [items, status, search]);

  return (
    <>
      <PageHeader title="Projetos" description="Acompanhe execução, prazos, tarefas e rentabilidade."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Novo projeto</Button>} />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder="Pesquisar projetos…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56"><option value="">Status: todos</option>{PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
      </div>
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon={FolderKanban} title={items.length ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"} description="Crie projetos para acompanhar tarefas, prazos e lucro."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Novo projeto</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const total = p.project_tasks.length, done = p.project_tasks.filter((t) => t.done).length;
            const progress = p.status === "done" ? 100 : total ? Math.round((done / total) * 100) : 0;
            const alerts = projectAlerts(p, total - done);
            const st = PROJECT_STATUSES.find((s) => s.id === p.status)!;
            return (
              <Link key={p.id} href={`/app/projetos/${p.id}`} className="card group flex flex-col p-5 transition hover:border-brand/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate font-semibold group-hover:text-brand-light">{p.name}</h3><p className="truncate text-xs text-muted">{p.clients?.name ?? "Sem cliente"}{p.category ? ` · ${p.category}` : ""}</p></div>
                  <ColorBadge color={st.color}>{projectStatusLabel(p.status)}</ColorBadge>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted"><span>{done}/{total} tarefas</span><span className="font-medium text-fg">{progress}%</span></div>
                <Progress value={progress} className="mt-1.5" />
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-muted">Contrato</p><p className="font-medium tabular-nums">{money(p.contract_value)}</p></div>
                  <div><p className="text-muted">Prazo</p><p className="flex items-center gap-1 font-medium"><Clock className="h-3 w-3" />{date(p.due_date)}</p></div>
                </div>
                {alerts.filter((a) => a.tone !== "neutral").length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">{alerts.filter((a) => a.tone !== "neutral").map((a) => (
                    <span key={a.text} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${a.tone === "red" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}><AlertTriangle className="h-3 w-3" />{a.text}</span>
                  ))}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <EntityFormModal entity="project" open={open} onClose={() => setOpen(false)} onSaved={load} />
    </>
  );
}
