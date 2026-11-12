"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge, StatCard } from "@/components/ui/Misc";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TX_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/ui/Feedback";
import { date, errorMessage, money } from "@/lib/utils";

export function TransactionsPage({ type }: { type: "income" | "expense" }) {
  const isIncome = type === "income";
  const { toast } = useFeedback();
  const [totals, setTotals] = useState<{ paid: number; pending: number; overdue: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    createClient().from("transactions").select("amount,status,date").eq("type", type).neq("status", "canceled")
      .then(({ data }: { data: { amount: number; status: string; date: string }[] | null }) => {
        let paid = 0, pending = 0, overdue = 0;
        for (const t of data ?? []) {
          if (t.status === "paid") paid += Number(t.amount);
          else { pending += Number(t.amount); if (t.date < today) overdue += Number(t.amount); }
        }
        setTotals({ paid, pending, overdue });
      });
  }, [type, reloadKey]);

  async function markPaid(id: string, reload: () => void) {
    const { error } = await createClient().from("transactions").update({ status: "paid" }).eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast(isIncome ? "Recebimento registrado." : "Pagamento registrado.");
    reload();
  }

  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <>
      <PageHeader title={isIncome ? "Receitas" : "Despesas"}
        description={isIncome ? "Lançamentos de entrada. Só valores recebidos entram no lucro." : "Lançamentos de saída. Só despesas pagas entram no lucro."} />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={isIncome ? "Total recebido" : "Total pago"} value={totals ? money(totals.paid) : "…"} icon={isIncome ? TrendingUp : TrendingDown} tone={isIncome ? "green" : "red"} />
        <StatCard label={isIncome ? "A receber" : "A pagar"} value={totals ? money(totals.pending) : "…"} icon={CheckCircle2} tone="yellow" />
        <StatCard label="Vencido" value={totals ? money(totals.overdue) : "…"} icon={CheckCircle2} tone="red" hint="Pendentes com data anterior a hoje" />
      </div>
      <CrudTable entity={type} baseFilter={{ type }} select="*, clients(name), projects(name)" searchColumns={["description", "category", "payment_method"]}
        defaultSort={{ column: "date", ascending: false }} allowDuplicate reloadKey={reloadKey} onChanged={() => setReloadKey((k) => k + 1)}
        filters={[
          { name: "status", label: "Status", options: TX_STATUSES.map((s) => ({ value: s.id, label: s.label })) },
          { name: "category", label: "Categoria", options: cats.map((c) => ({ value: c, label: c })) },
        ]}
        newLabel={isIncome ? "Nova receita" : "Nova despesa"} emptyIcon={isIncome ? TrendingUp : TrendingDown}
        emptyTitle={isIncome ? "Nenhuma receita lançada" : "Nenhuma despesa lançada"}
        emptyDescription="Registre lançamentos para acompanhar o fluxo de caixa e o lucro real."
        rowActions={(r, reload) => r.status === "pending" ? (
          <button onClick={() => markPaid(r.id, () => { reload(); setReloadKey((k) => k + 1); })} className="rounded-lg px-2 py-1 text-xs text-success hover:bg-success/10" title={isIncome ? "Marcar como recebido" : "Marcar como pago"}>
            {isIncome ? "Recebido" : "Pago"}
          </button>) : null}
        columns={[
          { key: "description", label: "Descrição", sortable: true, render: (r) => <div><p className="font-medium">{r.description}</p><p className="text-xs text-muted">{[r.clients?.name, r.projects?.name].filter(Boolean).join(" · ") || r.category || "—"}</p></div> },
          { key: "category", label: "Categoria", render: (r) => r.category ?? "—" },
          { key: "amount", label: "Valor", sortable: true, render: (r) => <span className={`tabular-nums font-medium ${isIncome ? "text-success" : "text-danger"}`}>{isIncome ? "+" : "−"} {money(r.amount)}</span> },
          { key: "date", label: "Vencimento", sortable: true, render: (r) => date(r.date) },
          { key: "paid_at", label: isIncome ? "Recebido em" : "Pago em", render: (r) => date(r.paid_at) },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "paid" ? "green" : r.status === "pending" ? "yellow" : "neutral"}>{r.status === "paid" ? (isIncome ? "Recebido" : "Pago") : r.status === "pending" ? "Pendente" : "Cancelado"}</Badge> },
        ]} />
    </>
  );
}
