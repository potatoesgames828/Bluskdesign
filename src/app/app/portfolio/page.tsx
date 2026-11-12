"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, GalleryHorizontalEnd, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioItem } from "@/lib/types";
import { PageHeader, Badge, Skeleton, EmptyState, Card } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { PortfolioEditor } from "@/components/app/PortfolioEditor";
import { useFeedback } from "@/components/ui/Feedback";
import { date, errorMessage } from "@/lib/utils";

export default function PortfolioPage() {
  const supabase = createClient();
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; item: PortfolioItem | null }>({ open: false, item: null });
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const load = useCallback(async () => {
    const { data } = await supabase.from("portfolio_items").select("*").order("position").order("created_at", { ascending: false });
    setItems((data as PortfolioItem[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function togglePublish(i: PortfolioItem) {
    const { error } = await supabase.from("portfolio_items").update({ published: !i.published }).eq("id", i.id);
    if (error) return toast(errorMessage(error), "error");
    toast(i.published ? "Item despublicado." : "Item publicado."); load();
  }
  async function move(idx: number, dir: -1 | 1) {
    const list = [...(items ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    setItems(list);
    const results = await Promise.all(list.map((it, k) => supabase.from("portfolio_items").update({ position: k }).eq("id", it.id)));
    if (results.some((r) => r.error)) { toast("Falha ao reordenar.", "error"); load(); }
  }
  async function remove(i: PortfolioItem) {
    if (!(await confirm({ title: "Excluir item?", description: i.title, danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("portfolio_items").delete().eq("id", i.id);
    if (error) return toast(errorMessage(error), "error");
    toast("Item excluído."); load();
  }

  const list = (items ?? []).filter((i) => filter === "all" || (filter === "published" ? i.published : !i.published));

  return (
    <>
      <PageHeader title="Portfólio" description="Administre e organize os trabalhos realizados."
        actions={<Button onClick={() => setEditor({ open: true, item: null })}><Plus className="h-4 w-4" />Adicionar trabalho</Button>} />
      <div className="mb-5 flex gap-1.5">
        {([["all", "Todos"], ["published", "Publicados"], ["draft", "Rascunhos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 text-sm ${filter === k ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-elevated"}`}>{l}</button>
        ))}
      </div>
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon={GalleryHorizontalEnd} title="Nenhum trabalho aqui" description="Adicione projetos concluídos com capa, galeria e link de demonstração."
          action={<Button onClick={() => setEditor({ open: true, item: null })}><Plus className="h-4 w-4" />Adicionar trabalho</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const idx = (items ?? []).indexOf(i);
            return (
              <div key={i.id} className="card group overflow-hidden">
                <Link href={`/app/portfolio/${i.id}`} className="relative block aspect-[16/10] bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.cover_url ? <img src={i.cover_url} alt={i.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-muted"><ImageIcon className="h-8 w-8" /></div>}
                  <Badge tone={i.published ? "green" : "neutral"} className="absolute left-3 top-3 backdrop-blur">{i.published ? "Publicado" : "Rascunho"}</Badge>
                </Link>
                <div className="p-4">
                  <Link href={`/app/portfolio/${i.id}`}><h3 className="truncate font-semibold hover:text-brand-light">{i.title}</h3></Link>
                  <p className="truncate text-xs text-muted">{[i.client_name, i.category, i.completed_at && date(i.completed_at)].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
                    <div className="flex">
                      {filter === "all" && <>
                        <button onClick={() => move(idx, -1)} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Mover para cima"><ArrowUp className="h-4 w-4" /></button>
                        <button onClick={() => move(idx, 1)} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Mover para baixo"><ArrowDown className="h-4 w-4" /></button>
                      </>}
                    </div>
                    <div className="flex">
                      <button onClick={() => togglePublish(i)} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" title={i.published ? "Despublicar" : "Publicar"} aria-label={i.published ? "Despublicar" : "Publicar"}>{i.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => setEditor({ open: true, item: i })} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PortfolioEditor open={editor.open} item={editor.item} onClose={() => setEditor({ open: false, item: null })} onSaved={load} />
    </>
  );
}
