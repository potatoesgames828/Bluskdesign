import { requireSession } from "@/lib/session";
import { stripeConfigured } from "@/lib/stripe";
import type { Plan } from "@/lib/types";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui/Misc";
import { LimitsTable, PlanFeatures, formatPrice } from "@/components/marketing/PlanCards";
import { SubscriptionActions } from "./actions";
import { date } from "@/lib/utils";

export const metadata = { title: "Assinatura" };

export default async function SubscriptionPage({ searchParams }: { searchParams: { checkout?: string } }) {
  const { supabase, plan, subscription } = await requireSession();
  const [{ data: plans }, { data: payments }, { data: usage }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(24),
    supabase.from("usage_counters").select("feature,count").eq("period", new Date().toISOString().slice(0, 7)),
  ]);
  const ps = (plans ?? []) as Plan[];
  const used = (k: string) => usage?.find((u) => u.feature === k)?.count ?? 0;
  const statusLabel: Record<string, string> = { active: "Ativa", trialing: "Em teste", past_due: "Pagamento pendente", canceled: "Cancelada", incomplete: "Incompleta" };

  return (
    <>
      <PageHeader title="Assinatura" description="Gerencie seu plano, pagamentos e limites de utilização." />
      {searchParams.checkout === "success" && <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">Pagamento enviado! Seu plano é atualizado automaticamente assim que o Stripe confirmar o pagamento (geralmente em segundos). Recarregue a página se necessário.</div>}
      {searchParams.checkout === "cancel" && <div className="mb-5 rounded-xl border border-line bg-elevated p-3 text-sm text-muted">Checkout cancelado. Nenhuma cobrança foi feita.</div>}
      {!stripeConfigured() && <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Pagamentos ainda não configurados neste ambiente (variáveis do Stripe). Upgrades ficam indisponíveis até a configuração.</div>}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="text-xs text-muted">Plano atual</p>
          <div className="mt-1 flex items-center gap-2"><h2 className="font-display text-3xl font-bold">{plan.name}</h2><Badge tone={subscription?.status === "active" ? "green" : "yellow"}>{statusLabel[subscription?.status ?? "active"]}</Badge></div>
          <p className="mt-1 text-sm text-muted">{formatPrice(plan)}{plan.price_cents ? " / mês" : ""}</p>
          {subscription?.current_period_end && <p className="mt-3 text-sm">{subscription.cancel_at_period_end ? "Encerra em" : "Renova em"} <strong>{date(subscription.current_period_end)}</strong></p>}
          <div className="mt-5 space-y-2 text-xs">
            {[["ai_messages", "Mensagens de IA"], ["prompt_generations", "Gerações de prompt"], ["hunter_searches", "Pesquisas Hunter"]].map(([k, l]) => (
              <div key={k} className="flex justify-between"><span className="text-muted">{l} (mês)</span><span className="tabular-nums">{used(k)} / {Number(plan.limits?.[`${k}_month`] ?? 0)}</span></div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {ps.map((p) => (
            <Card key={p.id} className={`flex flex-col p-5 ${p.id === plan.id ? "border-brand ring-1 ring-brand/40" : ""}`}>
              <div className="flex items-center justify-between"><h3 className="font-semibold">{p.name}</h3>{p.id === plan.id && <Badge tone="blue">Atual</Badge>}</div>
              <p className="mt-2 font-display text-2xl font-bold">{formatPrice(p)}<span className="text-xs font-normal text-muted">{p.price_cents ? "/mês" : ""}</span></p>
              <p className="mt-1 text-xs text-muted">{p.description}</p>
              <PlanFeatures id={p.id} className="mt-4 flex-1 text-xs" />
              <SubscriptionActions target={p.id} current={plan.id} cancelAtPeriodEnd={Boolean(subscription?.cancel_at_period_end)} paid={subscription?.provider === "stripe" && Boolean(subscription?.provider_subscription_id)} />
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Histórico de pagamentos" />
          <div className="p-3">
            {(payments ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted">Nenhum pagamento registrado.</p> : (payments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm">
                <div><p>{p.plan_id ? `Plano ${String(p.plan_id).toUpperCase()}` : "Assinatura"}</p><p className="text-xs text-muted">{date(p.paid_at ?? p.created_at)}</p></div>
                <div className="flex items-center gap-2"><span className="tabular-nums">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: p.currency }).format(p.amount_cents / 100)}</span>
                  <Badge tone={p.status === "paid" ? "green" : p.status === "failed" ? "red" : "yellow"}>{p.status === "paid" ? "Pago" : p.status === "failed" ? "Falhou" : p.status === "refunded" ? "Estornado" : "Pendente"}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Limites por plano" />
          <div className="p-4"><LimitsTable plans={ps} /></div>
        </Card>
      </div>
    </>
  );
}
