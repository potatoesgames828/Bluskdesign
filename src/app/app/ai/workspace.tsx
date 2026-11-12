"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Briefcase, Check, Copy, MessageSquarePlus, Pencil, Send, Sparkles, Trash2, AlertTriangle, Handshake, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Misc";
import { useFeedback } from "@/components/ui/Feedback";
import { renderMarkdown } from "@/lib/markdown";
import { cn, errorMessage, timeAgo, money } from "@/lib/utils";

type Assistant = "general" | "sales" | "projects";
interface Conv { id: string; title: string; assistant: Assistant; updated_at: string }
interface Msg { id: string; role: "user" | "assistant"; content: string; created_at: string }

const ASSISTANTS: { id: Assistant; label: string; icon: typeof Bot; desc: string; starters: string[] }[] = [
  { id: "general", label: "Assistente", icon: Sparkles, desc: "Ideias, textos, código e estratégia.", starters: ["Crie 5 ideias de posts para divulgar meus serviços de sites", "Explique a diferença entre landing page e site institucional para um cliente leigo", "Revise este texto para deixá-lo mais persuasivo:"] },
  { id: "sales", label: "Comercial", icon: Handshake, desc: "Mensagens, análise de leads, propostas e objeções.", starters: ["Crie uma mensagem de WhatsApp para abordar uma barbearia sem site", "Monte uma proposta comercial para um site institucional de R$ 2.500", "Como responder à objeção “está caro”?", "Quais os próximos passos para um lead que não respondeu há 5 dias?"] },
  { id: "projects", label: "Projetos", icon: Briefcase, desc: "Planejamento, tarefas, cronogramas, riscos e documentação.", starters: ["Planeje um projeto de e-commerce em 6 semanas com tarefas e cronograma", "Liste os riscos de um projeto de landing page com prazo de 7 dias", "Gere a documentação de escopo para um site institucional"] },
];

export function AiWorkspace({ configured, initialAssistant, used, limit }: { configured: boolean; initialAssistant: Assistant; used: number; limit: number }) {
  const supabase = createClient();
  const { toast, confirm } = useFeedback();
  const [assistant, setAssistant] = useState<Assistant>(initialAssistant);
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState(used);
  const [copied, setCopied] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [leads, setLeads] = useState<{ id: string; company_name: string; segment: string | null; city: string | null; website: string | null; score: number | null; notes: string | null }[]>([]);
  const [opps, setOpps] = useState<{ id: string; title: string; value: number; stage: string; notes: string | null }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from("ai_conversations").select("*").order("updated_at", { ascending: false });
    setConvs((data as Conv[]) ?? []);
  }, [supabase]);
  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => {
    supabase.from("leads").select("id,company_name,segment,city,website,score,notes").order("created_at", { ascending: false }).limit(50).then(({ data }: { data: typeof leads | null }) => setLeads(data ?? []));
    supabase.from("opportunities").select("id,title,value,stage,notes").order("created_at", { ascending: false }).limit(50).then(({ data }: { data: typeof opps | null }) => setOpps(data ?? []));
  }, [supabase]);
  useEffect(() => {
    if (!active) { setMsgs([]); return; }
    supabase.from("ai_messages").select("*").eq("conversation_id", active).order("created_at").then(({ data }: { data: Msg[] | null }) => setMsgs(data ?? []));
  }, [active, supabase]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, sending]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    const temp: Msg = { id: `tmp-${Date.now()}`, role: "user", content: message, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, temp]);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: active ?? undefined, assistant, message }) });
      const json = await res.json();
      if (json.conversationId && json.conversationId !== active) { setActive(json.conversationId); }
      if (!res.ok) throw new Error(json.error ?? "Erro ao enviar.");
      setMsgs((m) => [...m, json.message]);
      setUsage((u) => u + 1);
      loadConvs();
    } catch (e) {
      toast(errorMessage(e), "error");
      setMsgs((m) => m.filter((x) => x.id !== temp.id));
      setInput(message);
    } finally { setSending(false); }
  }

  async function rename(c: Conv) {
    const title = window.prompt("Novo nome da conversa:", c.title)?.trim();
    if (!title) return;
    const { error } = await supabase.from("ai_conversations").update({ title: title.slice(0, 120) }).eq("id", c.id);
    if (error) return toast(errorMessage(error), "error");
    loadConvs();
  }
  async function remove(c: Conv) {
    if (!(await confirm({ title: "Excluir conversa?", description: c.title, danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", c.id);
    if (error) return toast(errorMessage(error), "error");
    if (active === c.id) setActive(null);
    loadConvs();
  }
  async function copy(m: Msg) {
    await navigator.clipboard.writeText(m.content);
    setCopied(m.id); setTimeout(() => setCopied(null), 1500);
  }

  const A = ASSISTANTS.find((a) => a.id === assistant)!;
  const activeConv = convs?.find((c) => c.id === active);

  const list = (
    <div className="flex h-full flex-col">
      <div className="p-3"><Button className="w-full" onClick={() => { setActive(null); setListOpen(false); }}><MessageSquarePlus className="h-4 w-4" />Nova conversa</Button></div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {convs === null ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mx-1 my-1 h-10" />) : convs.length === 0 ? <p className="px-3 py-6 text-center text-xs text-muted">Nenhuma conversa ainda.</p> : convs.map((c) => (
          <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl px-3 py-2 text-sm", active === c.id ? "bg-brand/10 text-fg" : "text-muted hover:bg-elevated hover:text-fg")}>
            <button className="min-w-0 flex-1 text-left" onClick={() => { setActive(c.id); setAssistant(c.assistant); setListOpen(false); }}>
              <p className="truncate">{c.title}</p><p className="text-[11px] text-muted">{ASSISTANTS.find((a) => a.id === c.assistant)?.label} · {timeAgo(c.updated_at)}</p>
            </button>
            <button onClick={() => rename(c)} className="p-1 opacity-60 hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-60" aria-label="Renomear"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => remove(c)} className="p-1 opacity-60 hover:text-danger hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-60" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3 text-xs text-muted">Uso no mês: <span className="text-fg">{usage}</span> / {limit} mensagens</div>
    </div>
  );

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-4rem)] sm:-mx-6 lg:-mx-8 lg:-my-8">
      <aside className="hidden w-72 shrink-0 border-r border-line bg-surface/40 lg:block">{list}</aside>
      {listOpen && (
        <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setListOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs border-r border-line bg-surface"><div className="flex justify-end p-2"><button onClick={() => setListOpen(false)} className="p-2" aria-label="Fechar"><X className="h-5 w-5" /></button></div>{list}</aside>
        </div>
      )}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <button onClick={() => setListOpen(true)} className="rounded-lg p-1.5 text-muted hover:bg-elevated lg:hidden" aria-label="Conversas"><Menu className="h-5 w-5" /></button>
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {ASSISTANTS.map((a) => (
              <button key={a.id} disabled={!!active} onClick={() => setAssistant(a.id)} title={active ? "O assistente é definido ao criar a conversa" : a.desc}
                className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed", assistant === a.id ? "bg-brand text-white" : "text-muted hover:text-fg")}>
                <a.icon className="h-3.5 w-3.5" />{a.label}
              </button>
            ))}
          </div>
          <p className="truncate text-sm text-muted">{activeConv?.title ?? "Nova conversa"}</p>
        </div>

        {!configured && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A integração de IA ainda não está configurada no servidor (variável ANTHROPIC_API_KEY). As mensagens serão recusadas até a configuração.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {msgs.length === 0 && !sending && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand-light"><A.icon className="h-6 w-6" /></div>
                <h2 className="text-xl font-bold">Blusk AI · {A.label}</h2>
                <p className="mt-1 text-sm text-muted">{A.desc}</p>
                {assistant === "sales" && (leads.length > 0 || opps.length > 0) && (
                  <div className="mx-auto mt-5 grid max-w-xl gap-2 sm:grid-cols-2">
                    {leads.length > 0 && <Select defaultValue="" onChange={(e) => { const l = leads.find((x) => x.id === e.target.value); if (l) setInput(`Analise este lead e sugira a melhor abordagem comercial e uma mensagem inicial de WhatsApp:\n- Empresa: ${l.company_name}\n- Segmento: ${l.segment ?? "não informado"}\n- Cidade: ${l.city ?? "não informada"}\n- Site: ${l.website ?? "nenhum informado"}\n- Score de oportunidade: ${l.score ?? "não calculado"}\n- Observações: ${l.notes ?? "—"}`); }}>
                      <option value="">Analisar um lead…</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}
                    </Select>}
                    {opps.length > 0 && <Select defaultValue="" onChange={(e) => { const o = opps.find((x) => x.id === e.target.value); if (o) setInput(`Prepare uma proposta comercial e os próximos passos para esta oportunidade:\n- ${o.title}\n- Valor: ${money(o.value)}\n- Etapa atual: ${o.stage}\n- Observações: ${o.notes ?? "—"}`); }}>
                      <option value="">Preparar proposta para…</option>{opps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </Select>}
                  </div>
                )}
                <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {A.starters.map((s) => <button key={s} onClick={() => setInput(s)} className="rounded-xl border border-line bg-surface p-3 text-left text-sm text-muted transition hover:border-brand/40 hover:text-fg">{s}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-light"><Sparkles className="h-4 w-4" /></div>}
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-brand text-white" : "border border-line bg-surface")}>
                  {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <div className="prose-ai" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
                  {m.role === "assistant" && (
                    <button onClick={() => copy(m)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">{copied === m.id ? <><Check className="h-3 w-3" />Copiado</> : <><Copy className="h-3 w-3" />Copiar</>}</button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand-light"><Sparkles className="h-4 w-4 animate-pulse" /></div>
                <div className="rounded-2xl border border-line bg-surface px-4 py-3"><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}</span></div></div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-surface p-2 focus-within:border-brand">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={`Mensagem para o assistente ${A.label.toLowerCase()}…`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="max-h-48 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted" />
            <Button type="submit" size="icon" loading={sending} disabled={!input.trim()} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted">Enter para enviar · Shift+Enter para nova linha · respostas de IA podem conter erros</p>
        </form>
      </section>
    </div>
  );
}
