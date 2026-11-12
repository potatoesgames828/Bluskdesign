"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Copy, MessageSquare, Pencil, Phone, StickyNote, Trash2, ArrowRightLeft, CircleDollarSign, Sparkles, UserCog, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAGES, priorityLabel, stageLabel } from "@/lib/constants";
import type { Interaction, Opportunity, Stage } from "@/lib/types";
import { Card, CardHeader, Badge, ColorBadge, priorityTone, Skeleton, EmptyState } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { EntityFormModal } from "@/components/app/EntityForm";
import { useFeedback } from "@/components/ui/Feedback";
import { date, dateTime, errorMessage, money } from "@/lib/utils";

const ICONS: Record<string, typeof Phone> = { created: Sparkles, status_change: ArrowRightLeft, value_change: CircleDollarSign, contact: Phone, note: StickyNote, reminder: Bell, owner_change: UserCog };
const LABELS: Record<string, string> = { created: "Criação", status_change: "Mudança de status", value_change: "Alteração de valor", contact: "Contato realizado", note: "Observação", reminder: "Lembrete", owner_change: "Responsável" };

type Opp = Opportunity & { clients: { id: string; name: string } | null };

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast, confirm } = useFeedback();
  const [opp, setOpp] = useState<Opp | null | undefined>(undefined);
  const [timeline, setTimeline] = useState<Interaction[]>([]);
  const [type, setType] = useState<"contact" | "note">("contact");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from("opportunities").select("*, clients(id,name)").eq("id", id).maybeSingle(),
      supabase.from("interactions").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    ]);
    setOpp(o as Opp | null);
    setTimeline((t as Interaction[]) ?? []);
  }, [id, supabase]);
  useEffect(() => { load(); }, [load]);

  async function addInteraction() {
    if (!text.trim()) return toast("Escreva o conteúdo da interação.", "error");
    setSaving(true);
    const { error } = await supabase.from("interactions").insert({ opportunity_id: id, client_id: opp?.client_id, type, content: text.trim() });
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    setText("");
    toast("Interação registrada.");
    load();
  }

  async function changeStage(stage: Stage) {
    const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast("Etapa atualizada.");
    load(); router.refresh();
  }

  async function remove() {
    if (!(await confirm({ title: "Excluir oportunidade?", description: opp?.title, confirmLabel: "Excluir", danger: true }))) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast("Oportunidade excluída.");
    router.push("/app/crm"); router.refresh();
  }

  async function duplicate() {
    if (!opp) return;
    const { id: _i, clients: _c, created_at: _ca, closed_at: _cl, last_interaction_at: _l, ...rest } = opp;
    void _i; void _c; void _ca; void _cl; void _l;
    const { data, error } = await supabase.from("opportunities").insert({ ...rest, title: `${opp.title} (cópia)` }).select("id").single();
    if (error) return toast(errorMessage(error), "error");
    toast("Oportunidade duplicada.");
    router.push(`/app/crm/${data.id}`);
  }

  async function convertToClient() {
    if (!opp) return;
    const { data, error } = await supabase.from("clients").insert({ name: opp.contact_name || opp.company || opp.title, company: opp.company, category: opp.segment }).select("id").single();
    if (error) return toast(errorMessage(error), "error");
    await supabase.from("opportunities").update({ client_id: data.id }).eq("id", id);
    toast("Cliente criado e associado.");
    load();
  }

  if (opp === undefined) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-60 w-full" /></div>;
  if (opp === null) return <Card><EmptyState icon={MessageSquare} title="Oportunidade não encontrada" action={<Link href="/app/crm" className="text-brand-light">Voltar ao CRM</Link>} /></Card>;
  const stage = STAGES.find((s) => s.id === opp.stage)!;

  return (
    <>
      <Link href="/app/crm" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />CRM</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><ColorBadge color={stage.color}>{stage.label}</ColorBadge><Badge tone={priorityTone(opp.priority)}>Prioridade {priorityLabel(opp.priority).toLowerCase()}</Badge></div>
          <h1 className="text-2xl font-bold">{opp.title}</h1>
          <p className="mt-1 text-sm text-muted">{[opp.company, opp.contact_name, opp.segment].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={opp.stage} onChange={(e) => changeStage(e.target.value as Stage)} className="w-52" aria-label="Etapa">
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Editar</Button>
          <Button variant="secondary" onClick={duplicate} aria-label="Duplicar"><Copy className="h-4 w-4" /></Button>
          <Button variant="danger" onClick={remove} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5">
            <p className="text-xs text-muted">Valor potencial</p>
            <p className="font-display text-3xl font-bold tabular-nums">{money(opp.value)}</p>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Responsável", opp.owner ?? "—"],
                ["Cliente", opp.clients ? <Link key="c" href={`/app/clientes/${opp.clients.id}`} className="text-brand-light hover:underline">{opp.clients.name}</Link> : "—"],
                ["Lembrete", opp.reminder_at ? dateTime(opp.reminder_at) : "—"],
                ["Última interação", dateTime(opp.last_interaction_at)],
                ["Criada em", date(opp.created_at)],
                ["Encerrada em", date(opp.closed_at)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
            {!opp.client_id && <Button variant="outline" className="mt-5 w-full" onClick={convertToClient}><Plus className="h-4 w-4" />Converter em cliente</Button>}
          </Card>
          {opp.notes && <Card className="p-5"><h3 className="mb-2 text-sm font-semibold">Observações</h3><p className="whitespace-pre-wrap text-sm text-muted">{opp.notes}</p></Card>}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Histórico" subtitle="Linha do tempo da negociação" />
          <div className="p-5">
            <div className="mb-6 rounded-xl border border-line bg-bg/40 p-3">
              <div className="mb-2 flex gap-1.5">
                {(["contact", "note"] as const).map((t) => (
                  <button key={t} onClick={() => setType(t)} className={`rounded-lg px-3 py-1.5 text-xs ${type === t ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-elevated"}`}>{LABELS[t]}</button>
                ))}
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={type === "contact" ? "Ex.: Liguei para o cliente, pediu proposta até sexta." : "Escreva uma observação…"} className="min-h-[72px] border-0 bg-transparent focus:ring-0" />
              <div className="flex justify-end"><Button size="sm" onClick={addInteraction} loading={saving}>Registrar</Button></div>
            </div>
            <ol className="relative space-y-5 border-l border-line pl-6">
              {timeline.map((i) => {
                const Icon = ICONS[i.type] ?? StickyNote;
                const meta = i.metadata as { from?: number | string; to?: number | string };
                return (
                  <li key={i.id} className="relative">
                    <span className="absolute -left-[35px] grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-brand-light"><Icon className="h-3 w-3" /></span>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{LABELS[i.type] ?? i.type}</p>
                      <time className="text-xs text-muted">{dateTime(i.created_at)}</time>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">
                      {i.type === "value_change" ? `${money(Number(meta.from))} → ${money(Number(meta.to))}` : i.type === "status_change" && meta.from ? `${stageLabel(String(meta.from))} → ${stageLabel(String(meta.to))}` : i.content}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      </div>

      <EntityFormModal entity="opportunity" open={editOpen} onClose={() => setEditOpen(false)} initial={opp as unknown as Record<string, unknown>} onSaved={() => { load(); router.refresh(); }} />
    </>
  );
}
