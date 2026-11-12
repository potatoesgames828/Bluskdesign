"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Globe, Instagram, MapPin, MessageCircle, Phone, Radar, Save, Search, Send, SlidersHorizontal, Star, X, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SEGMENTS, BR_STATES, PRIORITIES } from "@/lib/constants";
import { DEFAULT_WEIGHTS, WEIGHT_LABELS, type Qualification, type Weights } from "@/lib/hunter/scoring";
import { PageHeader, Card, Badge, EmptyState, Skeleton, Progress } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { useApp } from "@/components/app/AppContext";
import { cn, dateTime, errorMessage, whatsappLink } from "@/lib/utils";

const HunterMap = dynamic(() => import("./HunterMap"), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-2xl" /> });

export interface HunterResult {
  externalId: string; name: string; category: string; address: string | null; phone: string | null; whatsapp: string | null;
  website: string | null; websiteKind: Qualification["websiteKind"]; instagram: string | null; rating: number | null; ratingCount: number;
  lat: number | null; lng: number | null; mapsUrl: string | null; source: string; verifiedAt: string; saved: boolean; qualification: Qualification;
}

const SITE_LABEL: Record<Qualification["websiteKind"], { text: string; tone: "red" | "yellow" | "green" | "neutral" }> = {
  none_listed: { text: "Sem site informado na fonte", tone: "red" },
  social_only: { text: "Apenas rede social / link", tone: "yellow" },
  builder: { text: "Site em construtor genérico", tone: "yellow" },
  own_site: { text: "Site próprio", tone: "green" },
};

export function Hunter({ configured, weights: initialWeights }: { configured: boolean; weights: Record<string, number> }) {
  const supabase = createClient();
  const router = useRouter();
  const { profile } = useApp();
  const { toast } = useFeedback();
  const [f, setF] = useState({ country: "Brasil", state: "SP", city: "", neighborhood: "", segment: SEGMENTS[0], category: "", name: "", website: "any", social: "any" });
  const [results, setResults] = useState<HunterResult[] | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "rating" | "name">("score");
  const [saveState, setSaveState] = useState<{ priority: string; notes: string; contactDate: string }>({ priority: "medium", notes: "", contactDate: "" });
  const [busy, setBusy] = useState(false);
  const [wOpen, setWOpen] = useState(false);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS, ...initialWeights });

  async function search(more = false) {
    if (!f.city.trim()) return toast("Informe a cidade.", "error");
    setLoading(true);
    try {
      const res = await fetch("/api/hunter/search", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, state: f.state || undefined, neighborhood: f.neighborhood || undefined, category: f.category || undefined, name: f.name || undefined, pageToken: more ? nextToken : undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResults((r) => (more && r ? [...r, ...json.results] : json.results));
      setNextToken(json.nextPageToken);
      setQuery(json.query);
      if (!more) setSelected(null);
    } catch (e) { toast(errorMessage(e), "error"); }
    setLoading(false);
  }

  const sorted = useMemo(() => [...(results ?? [])].sort((a, b) =>
    sortBy === "score" ? b.qualification.score - a.qualification.score : sortBy === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : a.name.localeCompare(b.name)), [results, sortBy]);
  const sel = results?.find((r) => r.externalId === selected) ?? null;

  async function saveLead(r: HunterResult, sendToCrm: boolean) {
    setBusy(true);
    try {
      const city = f.city.trim();
      const { data: lead, error } = await supabase.from("leads").upsert({
        company_name: r.name, phone: r.phone, whatsapp: r.whatsapp, website: r.websiteKind === "social_only" ? null : r.website, instagram: r.instagram,
        address: r.address, neighborhood: f.neighborhood || null, city, state: f.state || null, country: f.country, segment: f.segment,
        source: r.source, external_id: r.externalId, lat: r.lat, lng: r.lng, rating: r.rating, rating_count: r.ratingCount,
        score: r.qualification.score, score_breakdown: r.qualification, priority: saveState.priority, notes: saveState.notes || null,
        last_contact_at: saveState.contactDate ? new Date(saveState.contactDate).toISOString() : null, verified_at: r.verifiedAt,
      }, { onConflict: "user_id,external_id" }).select("id").single();
      if (error) throw error;
      setResults((rs) => rs!.map((x) => (x.externalId === r.externalId ? { ...x, saved: true } : x)));
      if (sendToCrm) {
        const { data: opp, error: e2 } = await supabase.from("opportunities").insert({
          title: `Oportunidade — ${r.name}`, company: r.name, segment: f.segment, lead_id: lead.id, priority: saveState.priority,
          notes: [saveState.notes, ...r.qualification.opportunities].filter(Boolean).join("\n"),
        }).select("id").single();
        if (e2) throw e2;
        await supabase.from("leads").update({ status: "qualified" }).eq("id", lead.id);
        toast("Lead salvo e enviado para o CRM.");
        router.push(`/app/crm/${opp.id}`);
      } else toast("Lead salvo em Contatos.");
    } catch (e) { toast(errorMessage(e), "error"); }
    setBusy(false);
  }

  async function saveWeights() {
    const prefs = { ...(profile.preferences ?? {}), hunter_weights: weights };
    const { error } = await supabase.from("profiles").update({ preferences: prefs }).eq("id", profile.id);
    if (error) return toast(errorMessage(error), "error");
    toast("Critérios salvos. Novas pesquisas usarão os novos pesos.");
    setWOpen(false); router.refresh();
  }

  return (
    <>
      <PageHeader title="Blusk Hunter" description="Encontre empresas com potencial de contratação a partir de dados públicos."
        actions={<Button variant="secondary" onClick={() => setWOpen(true)}><SlidersHorizontal className="h-4 w-4" />Critérios de pontuação</Button>} />
      {!configured && (
        <div className="mb-5 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>A pesquisa real depende da Google Places API. Configure <code>GOOGLE_PLACES_API_KEY</code> no servidor (veja o README). Nenhum resultado fictício é exibido.</span></div>
      )}

      <Card className="mb-6 p-4 sm:p-5">
        <form onSubmit={(e) => { e.preventDefault(); search(false); }} className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Field label="País"><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
          <Field label="Estado"><Select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}><option value="">—</option>{BR_STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Cidade *"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Ex.: Campinas" /></Field>
          <Field label="Bairro"><Input value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} /></Field>
          <Field label="Segmento"><Select value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })}>{SEGMENTS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Categoria comercial"><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Ex.: clínica veterinária" /></Field>
          <Field label="Nome da empresa"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Site"><Select value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })}><option value="any">Qualquer</option><option value="without">Sem site próprio informado</option><option value="with">Com site informado</option></Select></Field>
          <Field label="Redes sociais"><Select value={f.social} onChange={(e) => setF({ ...f, social: e.target.value })}><option value="any">Qualquer</option><option value="social_only">Link principal é rede social</option></Select></Field>
          <div className="col-span-2 flex items-end md:col-span-1 xl:col-span-3 xl:justify-end"><Button type="submit" loading={loading && !nextToken} className="w-full xl:w-auto"><Search className="h-4 w-4" />Pesquisar empresas</Button></div>
        </form>
      </Card>

      {results === null && !loading ? (
        <Card><EmptyState icon={Radar} title="Comece uma pesquisa" description="Escolha a região e o segmento. Os resultados vêm da Google Places API, com fonte e data de verificação." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
              <span className="truncate">{results ? `${results.length} empresa(s) · “${query}”` : "Pesquisando…"}</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-line bg-surface px-2 py-1">
                <option value="score">Maior score</option><option value="rating">Melhor avaliação</option><option value="name">Nome</option>
              </select>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {loading && !results && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              {results?.length === 0 && <Card><EmptyState icon={Search} title="Nenhuma empresa encontrada" description="Ajuste os filtros ou a região." /></Card>}
              {sorted.map((r) => (
                <button key={r.externalId} onClick={() => setSelected(r.externalId)} className={cn("card block w-full p-3.5 text-left transition hover:border-brand/40", selected === r.externalId && "border-brand ring-1 ring-brand/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{r.name}</p><p className="truncate text-xs text-muted">{r.category}</p></div>
                    <ScorePill score={r.qualification.score} />
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-xs text-muted"><MapPin className="mr-1 inline h-3 w-3" />{r.address ?? "Endereço não informado"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={SITE_LABEL[r.websiteKind].tone}>{SITE_LABEL[r.websiteKind].text}</Badge>
                    {r.rating != null && <Badge><Star className="h-3 w-3 fill-warning text-warning" />{r.rating} ({r.ratingCount})</Badge>}
                    {r.saved && <Badge tone="blue">Salvo</Badge>}
                  </div>
                </button>
              ))}
              {nextToken && <Button variant="secondary" className="w-full" loading={loading} onClick={() => search(true)}>Carregar mais resultados</Button>}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-3">
            <div className="h-[340px] overflow-hidden rounded-2xl border border-line lg:h-[380px]"><HunterMap results={results ?? []} selectedId={selected} onSelect={setSelected} /></div>
            {sel ? (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-lg font-bold">{sel.name}</h2><p className="text-sm text-muted">{sel.category}</p></div>
                  <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted hover:bg-elevated" aria-label="Fechar"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />{sel.address ?? "—"}</li>
                    <li className="flex gap-2"><Phone className="h-4 w-4 text-muted" />{sel.phone ?? "Não informado na fonte"}</li>
                    <li className="flex gap-2"><MessageCircle className="h-4 w-4 text-muted" />{sel.whatsapp ? `${sel.whatsapp} (celular — possivelmente WhatsApp)` : "Não identificado"}</li>
                    <li className="flex gap-2"><Globe className="h-4 w-4 text-muted" />{sel.website ? <a href={sel.website} target="_blank" rel="noopener noreferrer" className="truncate text-brand-light hover:underline">{sel.website}</a> : "Nenhum site informado na fonte"}</li>
                    <li className="flex gap-2"><Instagram className="h-4 w-4 text-muted" />{sel.instagram ?? "Não disponível na fonte"}</li>
                    <li className="flex gap-2"><Star className="h-4 w-4 text-muted" />{sel.rating != null ? `${sel.rating} de 5 · ${sel.ratingCount} avaliações públicas` : "Sem avaliações"}</li>
                    <li className="pt-2 text-xs text-muted">Fonte: {sel.source} · verificado em {dateTime(sel.verifiedAt)}{sel.mapsUrl && <> · <a href={sel.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-light">ver no Google Maps <ExternalLink className="inline h-3 w-3" /></a></>}</li>
                  </ul>
                  <div>
                    <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Score de oportunidade</p><ScorePill score={sel.qualification.score} large /></div>
                    <ul className="space-y-2.5">
                      {sel.qualification.criteria.map((c) => (
                        <li key={c.key} className="text-xs">
                          <div className="flex justify-between"><span>{c.label} <span className="text-muted">(peso {c.weight})</span></span><span className="tabular-nums">{Math.round(c.value * 100)}%</span></div>
                          <Progress value={c.value * 100} className="my-1" />
                          <p className="text-muted">{c.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {sel.qualification.opportunities.length > 0 && (
                  <div className="mt-5 rounded-xl border border-brand/25 bg-brand/5 p-3">
                    <p className="mb-1 text-sm font-semibold">Oportunidades identificadas</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{sel.qualification.opportunities.map((o) => <li key={o}>{o}</li>)}</ul>
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted"><Info className="mt-0.5 h-3 w-3 shrink-0" />Conclusões baseadas apenas nos dados públicos da fonte. Confirme antes de abordar — a ausência de site na fonte não comprova que a empresa não tenha um.</p>
                  </div>
                )}
                <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
                  <Field label="Prioridade"><Select value={saveState.priority} onChange={(e) => setSaveState({ ...saveState, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
                  <Field label="Data de contato"><Input type="datetime-local" value={saveState.contactDate} onChange={(e) => setSaveState({ ...saveState, contactDate: e.target.value })} /></Field>
                  <Field label="Observação" className="sm:col-span-3"><Textarea value={saveState.notes} onChange={(e) => setSaveState({ ...saveState, notes: e.target.value })} className="min-h-[60px]" /></Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" loading={busy} onClick={() => saveLead(sel, false)}><Save className="h-4 w-4" />{sel.saved ? "Atualizar lead" : "Salvar lead"}</Button>
                  <Button loading={busy} onClick={() => saveLead(sel, true)}><Send className="h-4 w-4" />Enviar para o CRM</Button>
                  {whatsappLink(sel.whatsapp ?? sel.phone) && <a href={whatsappLink(sel.whatsapp ?? sel.phone)!} target="_blank" rel="noopener noreferrer"><Button variant="outline"><MessageCircle className="h-4 w-4" />Abrir WhatsApp</Button></a>}
                  {sel.saved && <Link href="/app/contatos" className="self-center text-xs text-brand-light">Ver em Contatos</Link>}
                </div>
              </Card>
            ) : results && results.length > 0 ? <p className="text-center text-sm text-muted">Selecione uma empresa na lista ou no mapa para ver os detalhes.</p> : null}
          </div>
        </div>
      )}

      <Modal open={wOpen} onClose={() => setWOpen(false)} title="Critérios de pontuação" description="Defina o peso de cada critério (0–100). A pontuação final é a média ponderada."
        footer={<><Button variant="ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Restaurar padrão</Button><Button onClick={saveWeights}>Salvar critérios</Button></>}>
        <div className="space-y-4">
          {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((k) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm"><span>{WEIGHT_LABELS[k]}</span><span className="tabular-nums text-muted">{weights[k]}</span></div>
              <input type="range" min={0} max={100} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="w-full accent-[#3478F6]" />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

function ScorePill({ score, large }: { score: number; large?: boolean }) {
  const tone = score >= 70 ? "bg-success/15 text-success" : score >= 45 ? "bg-warning/15 text-warning" : "bg-brand/15 text-brand-light";
  return <span className={cn("shrink-0 rounded-lg font-bold tabular-nums", tone, large ? "px-2.5 py-1 text-base" : "px-2 py-0.5 text-xs")}>{score}</span>;
}
