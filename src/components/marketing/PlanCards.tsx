import { Check, Minus } from "lucide-react";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  free: ["Dashboard com indicadores reais", "CRM básico (Kanban + tabela)", "Cadastro de clientes", "Projetos e tarefas", "Portfólio", "Controle financeiro essencial"],
  pro: ["Tudo do Free", "Blusk AI: assistente geral, comercial e de projetos", "Gerador de prompts com histórico e favoritos", "Relatórios financeiros completos", "Recursos avançados de projetos", "Limites ampliados"],
  elite: ["Tudo do Pro", "Blusk Hunter: prospecção por região e segmento", "Mapa interativo e qualificação inteligente", "Mais mensagens de IA por mês", "Maiores limites de utilização", "Recursos avançados de prospecção"],
};

export function formatPrice(p: Plan) {
  if (!p.price_cents) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: p.currency || "BRL" }).format(p.price_cents / 100);
}

export function LimitsTable({ plans }: { plans: Plan[] }) {
  const rows: [string, string][] = [
    ["clients", "Clientes"], ["leads", "Leads"], ["opportunities", "Oportunidades"], ["projects", "Projetos"], ["portfolio_items", "Itens de portfólio"],
    ["ai_messages_month", "Mensagens de IA / mês"], ["prompt_generations_month", "Gerações de prompt / mês"], ["hunter_searches_month", "Pesquisas Hunter / mês"],
  ];
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>Limite</th>{plans.map((p) => <th key={p.id} className="text-center">{p.name}</th>)}</tr></thead>
        <tbody>
          {rows.map(([k, l]) => (
            <tr key={k}><td>{l}</td>{plans.map((p) => {
              const v = Number(p.limits?.[k] ?? 0);
              return <td key={p.id} className="text-center tabular-nums">{v === 0 ? <Minus className="mx-auto h-4 w-4 text-muted" /> : v >= 100000 ? "Ilimitado" : v.toLocaleString("pt-BR")}</td>;
            })}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlanFeatures({ id, className }: { id: string; className?: string }) {
  return (
    <ul className={cn("space-y-2.5 text-sm", className)}>
      {(PLAN_HIGHLIGHTS[id] ?? []).map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" /><span className="text-muted">{f}</span></li>)}
    </ul>
  );
}
