"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, History, RefreshCw, Star, Trash2, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROMPT_CATEGORIES } from "@/lib/constants";
import { PageHeader, Card, CardHeader, Skeleton } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFeedback } from "@/components/ui/Feedback";
import { cn, errorMessage, timeAgo } from "@/lib/utils";

interface Saved { id: string; category: string; objective: string; content: string; favorite: boolean; created_at: string; options: Record<string, string> }

export function PromptGenerator({ configured }: { configured: boolean }) {
  const supabase = createClient();
  const { toast, confirm } = useFeedback();
  const [category, setCategory] = useState("sites");
  const [objective, setObjective] = useState("");
  const [opts, setOpts] = useState({ audience: "", tone: "Profissional", detail: "muito detalhado", tech: "", extra: "" });
  const [result, setResult] = useState<Saved | null>(null);
  const [refineText, setRefineText] = useState("");
  const [loading, setLoading] = useState<"gen" | "refine" | null>(null);
  const [history, setHistory] = useState<Saved[] | null>(null);
  const [tab, setTab] = useState<"all" | "fav">("all");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from("saved_prompts").select("*").order("created_at", { ascending: false }).limit(50);
    if (tab === "fav") q = q.eq("favorite", true);
    const { data } = await q;
    setHistory((data as Saved[]) ?? []);
  }, [supabase, tab]);
  useEffect(() => { load(); }, [load]);

  async function generate(refine?: boolean) {
    if (!refine && objective.trim().length < 5) return toast("Descreva o objetivo com pelo menos 5 caracteres.", "error");
    if (refine && !refineText.trim()) return toast("Diga como deseja refinar o prompt.", "error");
    setLoading(refine ? "refine" : "gen");
    try {
      const res = await fetch("/api/ai/prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: refine && result ? result.category : category,
          objective: refine && result ? result.objective : objective,
          options: Object.fromEntries(Object.entries(opts).filter(([, v]) => v)),
          refine: refine && result ? { previous: result.content, instruction: refineText } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.saved ?? { id: "", category, objective, content: json.content, favorite: false, created_at: new Date().toISOString(), options: {} });
      setRefineText("");
      toast(refine ? "Prompt refinado." : "Prompt gerado e salvo no histórico.");
      load();
    } catch (e) { toast(errorMessage(e), "error"); }
    setLoading(null);
  }

  async function toggleFav(s: Saved) {
    const { error } = await supabase.from("saved_prompts").update({ favorite: !s.favorite }).eq("id", s.id);
    if (error) return toast(errorMessage(error), "error");
    if (result?.id === s.id) setResult({ ...s, favorite: !s.favorite });
    load();
  }
  async function remove(s: Saved) {
    if (!(await confirm({ title: "Excluir prompt?", danger: true, confirmLabel: "Excluir" }))) return;
    await supabase.from("saved_prompts").delete().eq("id", s.id);
    if (result?.id === s.id) setResult(null);
    load();
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast("Prompt copiado.");
  }

  return (
    <>
      <PageHeader title="Gerador de prompts" description="Descreva o objetivo e receba um prompt estruturado, detalhado e pronto para usar em qualquer IA." />
      {!configured && <div className="mb-4 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Integração de IA não configurada no servidor (ANTHROPIC_API_KEY).</div>}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {PROMPT_CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={cn("rounded-lg border px-3 py-1.5 text-xs", category === c.id ? "border-brand bg-brand/15 text-brand-light" : "border-line text-muted hover:text-fg")}>{c.label}</button>
              ))}
            </div>
            <Field label="Objetivo *"><Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Landing page para uma clínica odontológica captar agendamentos de implante pelo WhatsApp." className="min-h-[110px]" /></Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Público-alvo"><Input value={opts.audience} onChange={(e) => setOpts({ ...opts, audience: e.target.value })} placeholder="Ex.: adultos 30–55 anos, classe B" /></Field>
              <Field label="Tom"><Select value={opts.tone} onChange={(e) => setOpts({ ...opts, tone: e.target.value })}>{["Profissional", "Persuasivo", "Descontraído", "Técnico", "Premium / sofisticado", "Educativo"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Nível de detalhe"><Select value={opts.detail} onChange={(e) => setOpts({ ...opts, detail: e.target.value })}><option value="conciso">Conciso</option><option value="detalhado">Detalhado</option><option value="muito detalhado">Muito detalhado</option></Select></Field>
              <Field label="Tecnologias / ferramentas"><Input value={opts.tech} onChange={(e) => setOpts({ ...opts, tech: e.target.value })} placeholder="Ex.: Next.js, Tailwind, Remotion, Midjourney" /></Field>
              <Field label="Requisitos adicionais" className="sm:col-span-2"><Textarea value={opts.extra} onChange={(e) => setOpts({ ...opts, extra: e.target.value })} className="min-h-[60px]" /></Field>
            </div>
            <Button className="mt-5 w-full sm:w-auto" onClick={() => generate(false)} loading={loading === "gen"}><Wand2 className="h-4 w-4" />Gerar prompt</Button>
          </Card>

          {loading === "gen" && <Card className="space-y-2 p-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</Card>}
          {result && loading !== "gen" && (
            <Card>
              <CardHeader title="Prompt gerado" subtitle={PROMPT_CATEGORIES.find((c) => c.id === result.category)?.label}
                action={<div className="flex gap-1">
                  {result.id && <Button size="icon" variant="ghost" onClick={() => toggleFav(result)} aria-label="Favoritar"><Star className={cn("h-4 w-4", result.favorite && "fill-warning text-warning")} /></Button>}
                  <Button size="sm" onClick={() => copy(result.content)}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}Copiar</Button>
                </div>} />
              <pre className="m-5 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-bg/60 p-4 font-sans text-sm leading-relaxed">{result.content}</pre>
              <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
                <Input value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Refinar: ex. “adicione seção de SEO e deixe o tom mais premium”" />
                <Button variant="secondary" onClick={() => generate(true)} loading={loading === "refine"}><RefreshCw className="h-4 w-4" />Refinar</Button>
              </div>
            </Card>
          )}
        </div>

        <Card className="xl:col-span-2">
          <CardHeader title="Histórico" action={
            <div className="flex rounded-lg border border-line p-0.5 text-xs">
              <button onClick={() => setTab("all")} className={cn("rounded-md px-2 py-1", tab === "all" ? "bg-elevated text-fg" : "text-muted")}><History className="mr-1 inline h-3 w-3" />Todos</button>
              <button onClick={() => setTab("fav")} className={cn("rounded-md px-2 py-1", tab === "fav" ? "bg-elevated text-fg" : "text-muted")}><Star className="mr-1 inline h-3 w-3" />Favoritos</button>
            </div>} />
          <ul className="max-h-[720px] overflow-y-auto p-3">
            {history === null ? <Skeleton className="h-20" /> : history.length === 0 ? <li className="py-10 text-center text-sm text-muted">Nenhum prompt {tab === "fav" ? "favorito" : "gerado"} ainda.</li> : history.map((h) => (
              <li key={h.id} className={cn("group mb-1 rounded-xl p-3 hover:bg-elevated", result?.id === h.id && "bg-elevated")}>
                <button onClick={() => setResult(h)} className="w-full text-left">
                  <p className="line-clamp-2 text-sm">{h.objective}</p>
                  <p className="mt-1 text-[11px] text-muted">{PROMPT_CATEGORIES.find((c) => c.id === h.category)?.label} · {timeAgo(h.created_at)}</p>
                </button>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => toggleFav(h)} className="p-1 text-muted hover:text-warning" aria-label="Favoritar"><Star className={cn("h-3.5 w-3.5", h.favorite && "fill-warning text-warning")} /></button>
                  <button onClick={() => copy(h.content)} className="p-1 text-muted hover:text-fg" aria-label="Copiar"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(h)} className="p-1 text-muted hover:text-danger" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
