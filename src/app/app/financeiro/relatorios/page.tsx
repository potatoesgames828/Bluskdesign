import { requireSession, hasFeature } from "@/lib/session";
import { buckets, money, resolvePeriod, date } from "@/lib/utils";
import type { Transaction, Project } from "@/lib/types";
import { Card, CardHeader, PageHeader } from "@/components/ui/Misc";
import { TrendChart, BarsChart, DonutChart, PALETTE } from "@/components/charts/Charts";
import { PeriodFilter } from "@/components/app/PeriodFilter";
import { UpgradeGate } from "@/components/app/UpgradeGate";
import { ExportCsv } from "@/components/app/ExportCsv";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage({ searchParams }: { searchParams: { p?: string; from?: string; to?: string; cat?: string } }) {
  const { supabase, plan } = await requireSession();
  const period = resolvePeriod(searchParams.p ?? "year", searchParams.from, searchParams.to);
  const advanced = hasFeature(plan, "advanced_reports");
  const [{ data: txData }, { data: projData }] = await Promise.all([
    supabase.from("transactions").select("*, clients(name)").eq("status", "paid").gte("paid_at", period.from).lte("paid_at", period.to),
    supabase.from("projects").select("id,name,contract_value,estimated_cost,status"),
  ]);
  let txs = (txData ?? []) as (Transaction & { clients: { name: string } | null })[];
  const categories = Array.from(new Set(txs.map((t) => t.category).filter(Boolean))) as string[];
  if (searchParams.cat) txs = txs.filter((t) => t.category === searchParams.cat);

  const b = buckets(period.from, period.to);
  let bal = 0;
  const monthly = b.list.map((x) => {
    const inB = txs.filter((t) => b.bucketOf(t.paid_at!) === x.key);
    const r = inB.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const d = inB.filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    bal += r - d;
    return { label: x.label, receitas: r, despesas: d, lucro: r - d, saldo: bal };
  });

  const byClient = new Map<string, number>();
  txs.filter((t) => t.type === "income").forEach((t) => byClient.set(t.clients?.name ?? "Sem cliente", (byClient.get(t.clients?.name ?? "Sem cliente") ?? 0) + Number(t.amount)));
  const clientData = Array.from(byClient, ([label, receita]) => ({ label, receita })).sort((a, b) => b.receita - a.receita).slice(0, 10);

  const byCat = new Map<string, number>();
  txs.filter((t) => t.type === "expense").forEach((t) => byCat.set(t.category ?? "Outros", (byCat.get(t.category ?? "Outros") ?? 0) + Number(t.amount)));
  const expDist = Array.from(byCat, ([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] })).sort((a, b) => b.value - a.value);

  const projects = (projData ?? []) as Project[];
  const projProfit = projects.filter((p) => p.status !== "canceled").map((p) => {
    const inc = txs.filter((t) => t.project_id === p.id && t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = txs.filter((t) => t.project_id === p.id && t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    return { label: p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name, recebido: inc, custos: exp, lucro: inc - exp };
  }).filter((p) => p.recebido || p.custos).sort((a, b) => b.lucro - a.lucro).slice(0, 10);

  const csvRows = txs.map((t) => ({ tipo: t.type === "income" ? "Receita" : "Despesa", descricao: t.description, categoria: t.category ?? "", valor: Number(t.amount).toFixed(2), cliente: t.clients?.name ?? "", data_efetiva: t.paid_at ?? "", forma: t.payment_method ?? "" }));

  return (
    <>
      <PageHeader title="Relatórios" description={`Lançamentos efetivados entre ${date(period.from)} e ${date(period.to)}.`}
        actions={<ExportCsv rows={csvRows} filename={`blusk-financeiro-${period.from}_${period.to}.csv`} />} />
      <div className="mb-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <form className="flex gap-2" action="/app/financeiro/relatorios">
          <input type="hidden" name="p" value={period.key} />
          {period.key === "custom" && <><input type="hidden" name="from" value={period.from} /><input type="hidden" name="to" value={period.to} /></>}
          <select name="cat" defaultValue={searchParams.cat ?? ""} className="input h-9 w-52 py-1 text-sm" aria-label="Categoria">
            <option value="">Categoria: todas</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="rounded-xl border border-line px-3 text-sm hover:bg-elevated">Filtrar</button>
        </form>
        <PeriodFilter current={period.key} from={period.from} to={period.to} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Fluxo de caixa" subtitle="Saldo acumulado no período" />
          <div className="p-3 pt-4"><TrendChart data={monthly} series={[{ key: "saldo", name: "Saldo", color: "#3478F6" }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Receitas × despesas" subtitle={b.monthly ? "Mensal" : "Diário"} />
          <div className="p-3 pt-4"><BarsChart data={monthly} series={[{ key: "receitas", name: "Receitas", color: "#22C55E" }, { key: "despesas", name: "Despesas", color: "#EF4444" }]} /></div>
        </Card>
        {advanced ? (
          <>
            <Card>
              <CardHeader title="Lucro por período" />
              <div className="p-3 pt-4"><BarsChart data={monthly} series={[{ key: "lucro", name: "Lucro", color: "#3478F6" }]} /></div>
            </Card>
            <Card>
              <CardHeader title="Distribuição de despesas" />
              <div className="p-5">{expDist.length ? <DonutChart data={expDist} currency /> : <p className="py-14 text-center text-sm text-muted">Sem despesas pagas no período.</p>}</div>
            </Card>
            <Card>
              <CardHeader title="Receita por cliente" subtitle="Top 10" />
              <div className="p-3 pt-4">{clientData.length ? <BarsChart data={clientData} series={[{ key: "receita", name: "Receita", color: "#22C55E" }]} layout="vertical" height={Math.max(200, clientData.length * 36)} /> : <p className="py-14 text-center text-sm text-muted">Sem receitas no período.</p>}</div>
            </Card>
            <Card>
              <CardHeader title="Lucro por projeto" subtitle="Recebido − custos pagos vinculados" />
              <div className="p-3 pt-4">{projProfit.length ? <BarsChart data={projProfit} series={[{ key: "lucro", name: "Lucro", color: "#3478F6" }]} layout="vertical" height={Math.max(200, projProfit.length * 36)} /> : <p className="py-14 text-center text-sm text-muted">Vincule lançamentos a projetos para ver este relatório.</p>}</div>
            </Card>
          </>
        ) : (
          <div className="xl:col-span-2"><UpgradeGate title="Relatórios completos" description="Lucro mensal, receita por cliente, lucro por projeto e distribuição de despesas estão disponíveis a partir do plano Pro." /></div>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">Totais do período: receitas {money(monthly.reduce((a, m) => a + m.receitas, 0))} · despesas {money(monthly.reduce((a, m) => a + m.despesas, 0))} · lucro {money(monthly.reduce((a, m) => a + m.lucro, 0))}</p>
    </>
  );
}
