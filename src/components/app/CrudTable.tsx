"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ENTITIES, type EntityKey } from "@/lib/entities";
import { EntityFormModal } from "./EntityForm";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { useFeedback } from "@/components/ui/Feedback";
import { cn, errorMessage } from "@/lib/utils";

export type Row = Record<string, any>;

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** esconde em telas pequenas (vira card) */
  primary?: boolean;
}

export interface FilterDef { name: string; label: string; options: { value: string; label: string }[] }

export interface CrudTableProps {
  entity: EntityKey;
  columns: Column[];
  select?: string;
  searchColumns: string[];
  filters?: FilterDef[];
  baseFilter?: Record<string, string>;
  defaultSort?: { column: string; ascending: boolean };
  rowHref?: (row: Row) => string;
  rowActions?: (row: Row, reload: () => void) => ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  allowDuplicate?: boolean;
  newLabel?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  /** campos a remover ao duplicar/editar (joins) */
  stripOnEdit?: string[];
  reloadKey?: number;
  onChanged?: () => void;
}

export function CrudTable(p: CrudTableProps) {
  const def = ENTITIES[p.entity];
  const supabase = createClient();
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const pageSize = p.pageSize ?? 15;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(p.defaultSort ?? { column: "created_at", ascending: false });
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [debounced, filterVals]);

  const load = useCallback(async () => {
    let q = supabase.from(def.table).select(p.select ?? "*", { count: "exact" });
    for (const [k, v] of Object.entries(p.baseFilter ?? {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(filterVals)) if (v) q = q.eq(k, v);
    const term = debounced.replace(/[%,()]/g, " ").trim();
    if (term) q = q.or(p.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(","));
    q = q.order(sort.column, { ascending: sort.ascending, nullsFirst: false }).range(page * pageSize, page * pageSize + pageSize - 1);
    const { data, count, error } = await q;
    if (error) { toast(errorMessage(error), "error"); setRows([]); return; }
    setRows(data as Row[]);
    setTotal(count ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.table, p.select, JSON.stringify(p.baseFilter), JSON.stringify(filterVals), debounced, sort, page, pageSize]);

  useEffect(() => { load(); }, [load, p.reloadKey]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("blusk:reload", h);
    return () => window.removeEventListener("blusk:reload", h);
  }, [load]);

  const changed = () => { load(); router.refresh(); p.onChanged?.(); };

  function clean(row: Row) {
    const r: Row = {};
    for (const f of def.fields) r[f.name] = row[f.name];
    return r;
  }

  async function remove(row: Row) {
    const ok = await confirm({ title: `Excluir ${def.singular}?`, description: String(row[def.fields[0].name] ?? ""), confirmLabel: "Excluir", danger: true });
    if (!ok) return;
    const { error } = await supabase.from(def.table).delete().eq("id", row.id);
    if (error) return toast(errorMessage(error), "error");
    toast("Registro excluído.");
    changed();
  }

  async function duplicate(row: Row) {
    const copy = clean(row);
    const first = def.fields[0].name;
    copy[first] = `${copy[first]} (cópia)`;
    const { error } = await supabase.from(def.table).insert({ ...copy, ...(def as { fixed?: object }).fixed });
    if (error) return toast(errorMessage(error), "error");
    toast("Registro duplicado.");
    changed();
  }

  const toggleSort = (col: string) => setSort((s) => (s.column === col ? { column: col, ascending: !s.ascending } : { column: col, ascending: true }));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = debounced || Object.values(filterVals).some(Boolean);

  const actions = (row: Row) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {p.rowActions?.(row, changed)}
      <button onClick={() => { setEditing({ ...clean(row), id: row.id }); setFormOpen(true); }} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
      {p.allowDuplicate && <button onClick={() => duplicate(row)} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" title="Duplicar" aria-label="Duplicar"><Copy className="h-4 w-4" /></button>}
      <button onClick={() => remove(row)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" title="Excluir" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar…" className="input pl-9" aria-label="Pesquisar" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {p.filters?.map((f) => (
            <Select key={f.name} value={filterVals[f.name] ?? ""} onChange={(e) => setFilterVals((v) => ({ ...v, [f.name]: e.target.value }))} className="sm:w-44" aria-label={f.label}>
              <option value="">{f.label}: todos</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ))}
          {p.toolbar}
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="col-span-2 sm:col-span-1"><Plus className="h-4 w-4" />{p.newLabel ?? `Adicionar`}</Button>
        </div>
      </div>

      {rows === null ? (
        <div className="card space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={p.emptyIcon} title={hasQuery ? "Nenhum resultado" : p.emptyTitle}
            description={hasQuery ? "Ajuste a pesquisa ou os filtros." : p.emptyDescription}
            action={!hasQuery && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />{p.newLabel ?? "Adicionar"}</Button>} />
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="table-wrap hidden md:block">
            <table className="tbl">
              <thead>
                <tr>
                  {p.columns.map((c) => (
                    <th key={c.key} className={c.className}>
                      {c.sortable ? (
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-fg">
                          {c.label}
                          {sort.column === c.key && (sort.ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                  <th className="w-px text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={cn(p.rowHref && "cursor-pointer")} onClick={() => p.rowHref && router.push(p.rowHref(row))}>
                    {p.columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(row) : (row[c.key] ?? "—")}</td>)}
                    <td>{actions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards */}
          <div className="space-y-2.5 md:hidden">
            {rows.map((row) => {
              const [first, ...rest] = p.columns;
              const body = (
                <>
                  <div className="font-medium">{first.render ? first.render(row) : row[first.key]}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {rest.slice(0, 6).map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-muted">{c.label}</dt>
                        <dd className="truncate">{c.render ? c.render(row) : (row[c.key] ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              );
              return (
                <div key={row.id} className="card p-4">
                  {p.rowHref ? <Link href={p.rowHref(row)} className="block">{body}</Link> : body}
                  <div className="mt-2 border-t border-line pt-1">{actions(row)}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{total} registro(s) · página {page + 1} de {pages}</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((x) => x - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((x) => x + 1)} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}

      <EntityFormModal entity={p.entity} open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={changed} />
    </div>
  );
}
