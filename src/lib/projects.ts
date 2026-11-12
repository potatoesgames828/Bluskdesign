import { toISODate } from "./utils";

export function projectAlerts(p: { status: string; due_date: string | null; updated_at: string }, pendingTasks: number) {
  const today = toISODate(new Date());
  const in3 = toISODate(new Date(Date.now() + 3 * 86400000));
  const out: { tone: "red" | "yellow" | "neutral"; text: string }[] = [];
  if (["done", "canceled"].includes(p.status)) return out;
  if (p.due_date && p.due_date < today) out.push({ tone: "red", text: "Atrasado" });
  else if (p.due_date && p.due_date <= in3) out.push({ tone: "yellow", text: "Prazo próximo" });
  if (Date.now() - new Date(p.updated_at).getTime() > 14 * 86400000) out.push({ tone: "neutral", text: "Sem atualização há 14+ dias" });
  if (pendingTasks > 0) out.push({ tone: "neutral", text: `${pendingTasks} tarefa(s) pendente(s)` });
  return out;
}

