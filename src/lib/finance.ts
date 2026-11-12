import type { Transaction } from "./types";

/**
 * Regras:
 *  - Receita/despesa "efetiva" = status 'paid', contabilizada pela data paid_at.
 *  - Pendentes nunca entram como recebidas/pagas.
 *  - Lucro líquido = receitas recebidas − despesas pagas.
 */
export function inRange(d: string | null, from: string, to: string) {
  return !!d && d >= from && d <= to;
}

export function summarize(txs: Transaction[], from: string, to: string) {
  let received = 0, paidExpenses = 0, pendingIncome = 0, pendingExpenses = 0, grossIncome = 0;
  for (const t of txs) {
    if (t.status === "canceled") continue;
    const amt = Number(t.amount);
    if (t.type === "income") {
      if (inRange(t.date, from, to)) grossIncome += amt;
      if (t.status === "paid" && inRange(t.paid_at, from, to)) received += amt;
      if (t.status === "pending" && inRange(t.date, from, to)) pendingIncome += amt;
    } else {
      if (t.status === "paid" && inRange(t.paid_at, from, to)) paidExpenses += amt;
      if (t.status === "pending" && inRange(t.date, from, to)) pendingExpenses += amt;
    }
  }
  return { grossIncome, received, paidExpenses, pendingIncome, pendingExpenses, net: received - paidExpenses };
}

export function totalPending(txs: Transaction[]) {
  let receivable = 0, payable = 0;
  for (const t of txs) {
    if (t.status !== "pending") continue;
    if (t.type === "income") receivable += Number(t.amount);
    else payable += Number(t.amount);
  }
  return { receivable, payable };
}
