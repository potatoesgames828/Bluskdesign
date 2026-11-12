import Link from "next/link";
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, DollarSign, Hourglass, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { requireSession } from "@/lib/session";
import { summarize, totalPending } from "@/lib/finance";
import { buckets, date, money, resolvePeriod, toISODate } from "@/lib/utils";
import type { Transaction } from "@/lib/types";
import { Card, CardHeader, PageHeader, StatCard, Badge } from "@/components/ui/Misc";
import { TrendChart } from "@/components/charts/Charts";
import { PeriodFilter } from "@/components/app/PeriodFilter";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Visão financeira" };

export default async function FinancePage({ searchParams }: { searchParams: { p?: string; from?: string; to?: string } }) {
  const { supabase } = await requireSession();
  const period = resolvePeriod(searchParams.p, searchParams.from, searchParams.to);
  const { data } = await supabase.from("transactions").select("*, clients(name)").neq("status", "canceled").order("date");
  const txs = (data ?? []) as (Transaction & { clients: { name: string } | null })[];
  const s = summarize(txs, period.from, period.to);
  const pend = totalPending(txs);
  const today = toISODate(new Date());

  const b = buckets(period.from, period.to);
  let bal = txs.filter((t) => t.status === "paid" && t.paid_at! < period.from).reduce((a, t) => a + (t.type === "income" ? 1 : -1) * Number(t.amount), 0);
  const flow = b.list.map((x) => {
    const inB = txs.filter((t) => t.status === "paid" && t.paid_at && t.paid_at >= period.from && t.paid_at <= period.to && b.bucketOf(t.paid_at) === x.key);
    const ent = inB.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const sai = inB.filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    bal += ent - sai;
    return { label: x.label, entradas: ent, saidas: sai, saldo: bal };
  });
  const upcoming = txs.filter((t) => t.status === "pending").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  return (
    <>
      <PageHeader title="Visão financeira" description="Fluxo de caixa real: só entra no lucro o que foi efetivamente recebido ou pago." />
      <div className="mb-6 flex justify-end"><PeriodFilter current={period.key} from={period.from} to={period.to} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receita bruta (faturada)" value={money(s.grossIncome)} icon={Wallet} hint="Lançamentos com vencimento no período" />
        <StatCard label="Valores recebidos" value={money(s.received)} icon={TrendingUp} tone="green" />
        <StatCard label="Despesas pagas" value={money(s.paidExpenses)} icon={TrendingDown} tone="red" />
        <StatCard label="Lucro líquido" value={money(s.net)} icon={DollarSign} tone={s.net >= 0 ? "blue" : "red"} />
        <StatCard label="Pendentes no período" value={money(s.pendingIncome)} icon={Hourglass} tone="yellow" hint="Receitas ainda não recebidas" />
        <StatCard label="Contas a receber (total)" value={money(pend.receivable)} icon={ArrowDownCircle} tone="purple" />
        <StatCard label="Contas a pagar (total)" value={money(pend.payable)} icon={ArrowUpCircle} tone="red" />
        <StatCard label="Saldo do período" value={money(s.received - s.paidExpenses)} icon={AlertCircle} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Fluxo de caixa" subtitle="Entradas, saídas e saldo acumulado" />
          <div className="p-3 pt-4"><TrendChart data={flow} series={[{ key: "entradas", name: "Entradas", color: "#22C55E" }, { key: "saidas", name: "Saídas", color: "#EF4444" }, { key: "saldo", name: "Saldo", color: "#3478F6" }]} height={300} /></div>
        </Card>
        <Card>
          <CardHeader title="Próximos vencimentos" action={<Link href="/app/financeiro/receitas" className="text-xs text-brand-light">Ver</Link>} />
          <ul className="p-3">
            {upcoming.length === 0 && <li className="py-10 text-center text-sm text-muted">Nenhum lançamento pendente.</li>}
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-sm">{t.description}</p><p className={`text-xs ${t.date < today ? "text-danger" : "text-muted"}`}>{t.date < today ? "Vencido · " : ""}{date(t.date)}{t.clients?.name ? ` · ${t.clients.name}` : ""}</p></div>
                <Badge tone={t.type === "income" ? "green" : "red"}>{t.type === "income" ? "+" : "−"} {money(t.amount)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/app/financeiro/receitas" className={buttonClass("secondary")}>Gerenciar receitas</Link>
        <Link href="/app/financeiro/despesas" className={buttonClass("secondary")}>Gerenciar despesas</Link>
        <Link href="/app/financeiro/relatorios" className={buttonClass("primary")}>Relatórios completos</Link>
      </div>
    </>
  );
}
