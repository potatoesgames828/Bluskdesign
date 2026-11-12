"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useFeedback } from "@/components/ui/Feedback";
import { useApp } from "./AppContext";
import type { PortfolioItem } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

const empty = { title: "", client_name: "", category: "", description: "", cover_url: "", gallery: [] as string[], demo_url: "", completed_at: "", published: false };

export function PortfolioEditor({ open, onClose, item, onSaved }: { open: boolean; onClose: () => void; item: PortfolioItem | null; onSaved: () => void }) {
  const supabase = createClient();
  const { profile } = useApp();
  const { toast } = useFeedback();
  const [v, setV] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setV(item ? {
      title: item.title, client_name: item.client_name ?? "", category: item.category ?? "", description: item.description ?? "",
      cover_url: item.cover_url ?? "", gallery: item.gallery ?? [], demo_url: item.demo_url ?? "", completed_at: item.completed_at ?? "", published: item.published,
    } : empty);
  }, [open, item]);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) throw new Error("Envie apenas imagens.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Imagem acima de 5 MB.");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
  }

  async function onFiles(kind: "cover" | "gallery", files: FileList | null) {
    if (!files?.length) return;
    setUploading(kind);
    try {
      if (kind === "cover") { const url = await upload(files[0]); setV((x) => ({ ...x, cover_url: url })); }
      else { const urls = await Promise.all(Array.from(files).slice(0, 12).map(upload)); setV((x) => ({ ...x, gallery: [...x.gallery, ...urls] })); }
    } catch (e) { toast(errorMessage(e), "error"); }
    setUploading(null);
  }

  async function save() {
    if (!v.title.trim()) return toast("Informe o nome do projeto.", "error");
    let demo = v.demo_url.trim();
    if (demo && !/^https?:\/\//.test(demo)) demo = `https://${demo}`;
    setSaving(true);
    const payload = { ...v, title: v.title.trim(), demo_url: demo || null, completed_at: v.completed_at || null, cover_url: v.cover_url || null,
      client_name: v.client_name || null, category: v.category || null, description: v.description || null };
    const { error } = item ? await supabase.from("portfolio_items").update(payload).eq("id", item.id) : await supabase.from("portfolio_items").insert(payload);
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    toast(item ? "Item atualizado." : "Item adicionado ao portfólio.");
    onSaved(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? "Editar item do portfólio" : "Novo item do portfólio"} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save} loading={saving}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do projeto *" className="sm:col-span-2"><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
        <Field label="Cliente"><Input value={v.client_name} onChange={(e) => setV({ ...v, client_name: e.target.value })} /></Field>
        <Field label="Categoria"><Input value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} placeholder="Site, Landing page, Identidade…" /></Field>
        <Field label="Link de demonstração"><Input value={v.demo_url} onChange={(e) => setV({ ...v, demo_url: e.target.value })} placeholder="https://" /></Field>
        <Field label="Data de conclusão"><Input type="date" value={v.completed_at} onChange={(e) => setV({ ...v, completed_at: e.target.value })} /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <Field label="Imagem de capa" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.cover_url ? <img src={v.cover_url} alt="" className="h-20 w-32 rounded-lg object-cover" /> : <div className="grid h-20 w-32 place-items-center rounded-lg border border-dashed border-line text-muted"><ImagePlus className="h-5 w-5" /></div>}
            <Button type="button" variant="secondary" size="sm" loading={uploading === "cover"} onClick={() => coverRef.current?.click()}>Enviar capa</Button>
            {v.cover_url && <Button type="button" variant="ghost" size="sm" onClick={() => setV({ ...v, cover_url: "" })}>Remover</Button>}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFiles("cover", e.target.files); e.target.value = ""; }} />
          </div>
        </Field>
        <Field label="Galeria" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {v.gallery.map((g) => (
              <div key={g} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g} alt="" className="h-16 w-24 rounded-lg object-cover" />
                <button type="button" onClick={() => setV({ ...v, gallery: v.gallery.filter((x) => x !== g) })} className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-0.5 text-white" aria-label="Remover imagem"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <button type="button" onClick={() => galRef.current?.click()} disabled={uploading === "gallery"} className="grid h-16 w-24 place-items-center rounded-lg border border-dashed border-line text-xs text-muted hover:border-brand/50">{uploading === "gallery" ? "Enviando…" : "+ Imagens"}</button>
            <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles("gallery", e.target.files); e.target.value = ""; }} />
          </div>
        </Field>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[#3478F6]" checked={v.published} onChange={(e) => setV({ ...v, published: e.target.checked })} />Publicado</label>
      </div>
    </Modal>
  );
}
