import Link from "next/link";
import { Activity, Briefcase, Contact, DollarSign, Percent, Target, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { requireSession } from "@/lib/session";
import { summarize } from "@/lib/finance";
import { PROJECT_STATUSES } from "@/lib/constants";
import { buckets, money, num, pct, resolvePeriod, date } from "@/lib/utils";
import type { ActivityLog, Transaction } from "@/lib/types";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/ui/Misc";
import { TrendChart, BarsChart, DonutChart } from "@/components/charts/Charts";
import { PeriodFilter } from "@/components/app/PeriodFilter";
import { QuickActions } from "@/components/app/QuickActions";
import { ActivityList } from "@/components/app/ActivityList";

export const metadata = { title: "Visão geral" };

export default async function Dashboard({ searchParams }: { searchParams: { p?: string; from?: string; to?: string } }) {
  const { supabase, profile } = await requireSession();
  const period = resolvePeriod(searchParams.p, searchParams.from, searchParams.to);

  const [tx, clients, projects, leads, opps, acts] = await Promise.all([
    supabase.from("transactions").select("type,amount,status,date,paid_at").neq("status", "canceled"),
    supabase.from("clients").select("created_at,status"),
    supabase.from("projects").select("status"),
    supabase.from("leads").select("created_at"),
    supabase.from("opportunities").select("stage,closed_at,created_at,value"),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  const txs = (tx.data ?? []) as Transaction[];
  const cl = clients.data ?? [], pj = projects.data ?? [], ld = leads.data ?? [], op = opps.data ?? [];
  const fin = summarize(txs, period.from, period.to);
  const inPeriod = (d: string | null) => !!d && d.slice(0, 10) >= period.from && d.slice(0, 10) <= period.to;

  const openOpps = op.filter((o) => !["won", "lost"].includes(o.stage)).length;
  const wonP = op.filter((o) => o.stage === "won" && inPeriod(o.closed_at)).length;
  const lostP = op.filter((o) => o.stage === "lost" && inPeriod(o.closed_at)).length;
  const conversion = wonP + lostP ? (wonP / (wonP + lostP)) * 100 : 0;
  const empty = !txs.length && !cl.length && !pj.length && !ld.length && !op.length;

  // Séries
  const b = buckets(period.from, period.to);
  const fin_series = b.list.map((x) => ({ key: x.key, label: x.label, receitas: 0, despesas: 0, lucro: 0 }));
  const idx = new Map(fin_series.map((x, i) => [x.key, i]));
  for (const t of txs) {
    if (t.status !== "paid" || !inPeriod(t.paid_at)) continue;
    const i = idx.get(b.bucketOf(t.paid_at!));
    if (i === undefined) continue;
    if (t.type === "income") fin_series[i].receitas += Number(t.amount); else fin_series[i].despesas += Number(t.amount);
  }
  fin_series.forEach((x) => (x.lucro = x.receitas - x.despesas));

  const before = cl.filter((c) => c.created_at.slice(0, 10) < period.from).length;
  let acc = before;
  const clientGrowth = b.list.map((x) => {
    acc += cl.filter((c) => b.bucketOf(c.created_at.slice(0, 10)) === x.key && inPeriod(c.created_at)).length;
    return { label: x.label, clientes: acc };
  });
  const convSeries = b.list.map((x) => ({
    label: x.label,
    ganhas: op.filter((o) => o.stage === "won" && o.closed_at && inPeriod(o.closed_at) && b.bucketOf(o.closed_at.slice(0, 10)) === x.key).length,
    perdidas: op.filter((o) => o.stage === "lost" && o.closed_at && inPeriod(o.closed_at) && b.bucketOf(o.closed_at.slice(0, 10)) === x.key).length,
  }));
  const projDist = PROJECT_STATUSES.map((s) => ({ name: s.label, value: pj.filter((p) => p.status === s.id).length, color: s.color })).filter((d) => d.value > 0);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const first = (profile.full_name || "").split(" ")[0];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{date(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-2xl font-bold sm:text-[28px]">{greet}{first ? `, ${first}` : ""} 👋</h1>
          <p className="mt-1 text-sm text-muted">Período: {date(period.from)} — {date(period.to)}</p>
        </div>
        <PeriodFilter current={period.key} from={period.from} to={period.to} />
      </div>

      {empty && (
        <Card className="mb-6 border-brand/30 bg-gradient-to-br from-brand/10 to-transparent">
          <EmptyState icon={Activity} title="Bem-vindo à Blusk Design" description="Seu painel ainda não tem dados. Comece cadastrando um lead, cliente ou lançamento — os indicadores são calculados a partir dos seus registros reais." />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receita recebida" value={money(fin.received)} icon={TrendingUp} tone="green" hint={`Faturado no período: ${money(fin.grossIncome)}`} />
        <StatCard label="Despesas pagas" value={money(fin.paidExpenses)} icon={TrendingDown} tone="red" />
        <StatCard label="Lucro líquido" value={money(fin.net)} icon={DollarSign} tone={fin.net >= 0 ? "blue" : "red"} hint="Recebido − pago" />
        <StatCard label="Clientes ativos" value={num(cl.filter((c) => c.status === "active").length)} icon={Users} tone="purple" />
        <StatCard label="Projetos em andamento" value={num(pj.filter((p) => !["done", "canceled", "planning"].includes(p.status)).length)} icon={Briefcase} />
        <StatCard label="Leads cadastrados" value={num(ld.length)} icon={Contact} tone="yellow" hint={`${ld.filter((l) => inPeriod(l.created_at)).length} no período`} />
        <StatCard label="Oportunidades abertas" value={num(openOpps)} icon={Target} />
        <StatCard label="Taxa de conversão" value={pct(conversion)} icon={Percent} tone="green" hint={`${wonP} ganhas · ${lostP} perdidas no período`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Receitas, despesas e lucro" subtitle="Valores efetivamente recebidos e pagos" action={<Link href="/app/financeiro/relatorios" className="text-xs text-brand-light hover:underline">Relatórios</Link>} />
          <div className="p-3 pt-4"><TrendChart data={fin_series} series={[{ key: "receitas", name: "Receitas", color: "#22C55E" }, { key: "despesas", name: "Despesas", color: "#EF4444" }, { key: "lucro", name: "Lucro", color: "#3478F6" }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Projetos por status" />
          <div className="p-5">{projDist.length ? <DonutChart data={projDist} /> : <p className="py-16 text-center text-sm text-muted">Nenhum projeto cadastrado.</p>}</div>
        </Card>
        <Card>
          <CardHeader title="Crescimento de clientes" subtitle="Total acumulado" />
          <div className="p-3 pt-4"><TrendChart data={clientGrowth} series={[{ key: "clientes", name: "Clientes", color: "#A78BFA" }]} currency={false} type="line" height={220} /></div>
        </Card>
        <Card>
          <CardHeader title="Conversão de oportunidades" subtitle="Fechamentos no período" />
          <div className="p-3 pt-4"><BarsChart data={convSeries} series={[{ key: "ganhas", name: "Ganhas", color: "#22C55E" }, { key: "perdidas", name: "Perdidas", color: "#EF4444" }]} currency={false} height={220} /></div>
        </Card>
        <Card>
          <CardHeader title="Ações rápidas" />
          <div className="p-5"><QuickActions /></div>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Atividades recentes" action={<Link href="/app/atividades" className="text-xs text-brand-light hover:underline">Ver todas</Link>} />
          <div className="pt-2">
            {(acts.data ?? []).length ? <ActivityList items={acts.data as ActivityLog[]} /> : <p className="px-5 py-10 text-center text-sm text-muted">As atividades aparecerão aqui conforme você usar a plataforma.</p>}
          </div>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-muted"><Wallet className="mr-1 inline h-3 w-3" />Lucro líquido = receitas recebidas − despesas pagas. Valores pendentes não são contabilizados.</p>
    </>
  );
}
