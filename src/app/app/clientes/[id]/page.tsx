"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, FolderKanban, Mail, MapPin, MessageCircle, Pencil, Phone, Trash2, Upload, Users, Download, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { projectStatusLabel, PROJECT_STATUSES, stageLabel } from "@/lib/constants";
import type { Client, Interaction, Opportunity, Project, Transaction } from "@/lib/types";
import { Card, CardHeader, Badge, ColorBadge, Skeleton, EmptyState, StatCard } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { EntityFormModal } from "@/components/app/EntityForm";
import { useFeedback } from "@/components/ui/Feedback";
import { useApp } from "@/components/app/AppContext";
import { date, dateTime, errorMessage, money, whatsappLink } from "@/lib/utils";

interface StoredFile { name: string; created_at: string; metadata: { size?: number } | null }

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useApp();
  const { toast, confirm } = useFeedback();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Interaction[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [note, setNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folder = `${profile.id}/${id}`;

  const load = useCallback(async () => {
    const [c, p, o, t, n, f] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("client_id", id).eq("type", "income").order("date", { ascending: false }),
      supabase.from("interactions").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.storage.from("client-files").list(folder, { sortBy: { column: "created_at", order: "desc" } }),
    ]);
    setClient(c.data as Client | null);
    setProjects((p.data as Project[]) ?? []);
    setOpps((o.data as Opportunity[]) ?? []);
    setTxs((t.data as Transaction[]) ?? []);
    setNotes((n.data as Interaction[]) ?? []);
    setFiles(((f.data as StoredFile[]) ?? []).filter((x) => x.name !== ".emptyFolderPlaceholder"));
  }, [id, supabase, folder]);
  useEffect(() => { load(); }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    const { error } = await supabase.from("interactions").insert({ client_id: id, type: "note", content: note.trim() });
    if (error) return toast(errorMessage(error), "error");
    setNote(""); toast("Observação registrada."); load();
  }

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast("Arquivo acima de 10 MB.", "error");
    setUploading(true);
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const { error } = await supabase.storage.from("client-files").upload(`${folder}/${Date.now()}-${safe}`, file);
    setUploading(false);
    if (error) return toast(errorMessage(error), "error");
    toast("Arquivo enviado."); load();
  }

  async function download(name: string) {
    const { data, error } = await supabase.storage.from("client-files").createSignedUrl(`${folder}/${name}`, 60);
    if (error) return toast(errorMessage(error), "error");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function removeFile(name: string) {
    if (!(await confirm({ title: "Excluir arquivo?", description: name, danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.storage.from("client-files").remove([`${folder}/${name}`]);
    if (error) return toast(errorMessage(error), "error");
    load();
  }

  async function remove() {
    if (!(await confirm({ title: "Excluir cliente?", description: "Projetos, oportunidades e lançamentos serão mantidos sem vínculo.", danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast("Cliente excluído."); router.push("/app/clientes"); router.refresh();
  }

  if (client === undefined) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (client === null) return <Card><EmptyState icon={Users} title="Cliente não encontrado" action={<Link href="/app/clientes" className="text-brand-light">Voltar</Link>} /></Card>;

  const contracted = projects.filter((p) => p.status !== "canceled").reduce((a, p) => a + Number(p.contract_value), 0);
  const received = txs.filter((t) => t.status === "paid").reduce((a, t) => a + Number(t.amount), 0);
  const pending = txs.filter((t) => t.status === "pending").reduce((a, t) => a + Number(t.amount), 0);
  const wa = whatsappLink(client.whatsapp ?? client.phone);

  return (
    <>
      <Link href="/app/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />Clientes</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{client.name}</h1><Badge tone={client.status === "active" ? "green" : "neutral"}>{client.status === "active" ? "Ativo" : "Inativo"}</Badge></div>
          <p className="mt-1 text-sm text-muted">{[client.company, client.category].filter(Boolean).join(" · ") || "—"} · cliente desde {date(client.created_at)}</p>
        </div>
        <div className="flex gap-2">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer"><Button variant="secondary"><MessageCircle className="h-4 w-4" />WhatsApp</Button></a>}
          <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Editar</Button>
          <Button variant="danger" onClick={remove} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valor contratado" value={money(contracted)} icon={FileText} />
        <StatCard label="Recebido" value={money(received)} icon={FileText} tone="green" />
        <StatCard label="A receber" value={money(pending)} icon={FileText} tone="yellow" />
        <StatCard label="Projetos" value={projects.length} icon={FolderKanban} tone="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Dados cadastrais</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-muted" />{client.email ? <a href={`mailto:${client.email}`} className="hover:text-brand-light">{client.email}</a> : "—"}</li>
              <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-muted" />{client.phone ?? "—"}</li>
              <li className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 text-muted" />{client.whatsapp ?? "—"}</li>
              <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-muted" />{client.address ?? "—"}</li>
            </ul>
            {client.notes && <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-sm text-muted">{client.notes}</p>}
          </Card>
          <Card>
            <CardHeader title="Arquivos" subtitle="Contratos, briefings e documentos"
              action={<Button size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Enviar</Button>} />
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            <ul className="p-3">
              {files.length === 0 && <li className="px-2 py-4 text-center text-xs text-muted">Nenhum arquivo enviado.</li>}
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-elevated">
                  <FileText className="h-4 w-4 shrink-0 text-muted" />
                  <span className="flex-1 truncate">{f.name.replace(/^\d+-/, "")}</span>
                  <button onClick={() => download(f.name)} className="p-1 text-muted hover:text-fg" aria-label="Baixar"><Download className="h-4 w-4" /></button>
                  <button onClick={() => removeFile(f.name)} className="p-1 text-muted hover:text-danger" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Projetos e contratos" />
            <div className="p-3">
              {projects.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">Nenhum projeto vinculado.</p> : projects.map((p) => (
                <Link key={p.id} href={`/app/projetos/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-elevated">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-muted">Prazo {date(p.due_date)}</p></div>
                  <div className="flex items-center gap-3"><span className="text-sm tabular-nums">{money(p.contract_value)}</span><ColorBadge color={PROJECT_STATUSES.find((s) => s.id === p.status)!.color}>{projectStatusLabel(p.status)}</ColorBadge></div>
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Pagamentos" />
            <div className="p-3">
              {txs.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">Nenhum lançamento vinculado.</p> : txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm">{t.description}</p><p className="text-xs text-muted">Venc. {date(t.date)}{t.paid_at ? ` · recebido ${date(t.paid_at)}` : ""}</p></div>
                  <div className="flex items-center gap-3"><span className="text-sm tabular-nums">{money(t.amount)}</span><Badge tone={t.status === "paid" ? "green" : t.status === "pending" ? "yellow" : "neutral"}>{t.status === "paid" ? "Recebido" : t.status === "pending" ? "Pendente" : "Cancelado"}</Badge></div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Histórico comercial e observações" />
            <div className="p-5">
              <div className="mb-5 flex gap-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Registrar observação…" className="min-h-[44px]" /><Button onClick={addNote}>Salvar</Button></div>
              {opps.map((o) => (
                <Link key={o.id} href={`/app/crm/${o.id}`} className="mb-2 flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm hover:border-brand/40">
                  <span className="truncate">{o.title}</span><span className="text-xs text-muted">{stageLabel(o.stage)} · {money(o.value)}</span>
                </Link>
              ))}
              <ul className="mt-4 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3 text-sm"><StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><div><p className="whitespace-pre-wrap">{n.content}</p><p className="text-xs text-muted">{dateTime(n.created_at)}</p></div></li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
      <EntityFormModal entity="client" open={editOpen} onClose={() => setEditOpen(false)} initial={client as unknown as Record<string, unknown>} onSaved={load} />
    </>
  );
}
