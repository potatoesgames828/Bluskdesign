import { LayoutDashboard, KanbanSquare, Radar, Sparkles, Wallet, FolderKanban, TrendingUp, Users, Target } from "lucide-react";

/** Ilustração do produto com DADOS DEMONSTRATIVOS (identificados na interface). */
const bars = [38, 52, 45, 61, 58, 72, 66, 80, 76, 88, 84, 96];

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative rounded-2xl border border-line bg-surface/90 p-2 shadow-[0_40px_120px_-40px_rgba(52,120,246,.45)] backdrop-blur">
      <span className="absolute -top-3 right-4 z-10 rounded-full border border-warning/30 bg-bg px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">Dados demonstrativos</span>
      <div className="flex overflow-hidden rounded-xl border border-line bg-bg">
        {!compact && (
          <aside className="hidden w-44 shrink-0 border-r border-line p-3 sm:block">
            <div className="mb-4 flex items-center gap-2"><span className="h-5 w-5 rounded-md bg-brand" /><span className="text-xs font-bold">blusk.design</span></div>
            {[[LayoutDashboard, "Visão geral", true], [Sparkles, "Blusk AI"], [Radar, "Blusk Hunter"], [KanbanSquare, "CRM"], [FolderKanban, "Projetos"], [Wallet, "Financeiro"]].map(([I, l, a]) => {
              const Icon = I as typeof Radar;
              return <div key={String(l)} className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${a ? "bg-brand/15 text-fg" : "text-muted"}`}><Icon className="h-3.5 w-3.5" />{String(l)}</div>;
            })}
          </aside>
        )}
        <div className="flex-1 p-3 sm:p-4">
          <p className="text-[11px] text-muted">Boa tarde, Ana 👋</p>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[[TrendingUp, "Receita", "R$ 48,2 mil", "text-success"], [Users, "Clientes ativos", "126", "text-violet-400"], [Target, "Oportunidades", "34", "text-brand-light"], [Wallet, "Lucro líquido", "R$ 21,7 mil", "text-brand-light"]].map(([I, l, v, c]) => {
              const Icon = I as typeof Radar;
              return (
                <div key={String(l)} className="rounded-lg border border-line bg-surface p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-muted">{String(l)}<Icon className={`h-3 w-3 ${c}`} /></div>
                  <p className="mt-1 font-display text-sm font-bold">{String(v)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface p-3 lg:col-span-2">
              <p className="text-[10px] text-muted">Receitas × despesas</p>
              <div className="mt-2 flex h-24 items-end gap-1">
                {bars.map((h, i) => <div key={i} className="flex h-full flex-1 flex-col justify-end gap-0.5"><div className="rounded-sm bg-brand/80" style={{ height: `${h}%` }} /><div className="rounded-sm bg-danger/50" style={{ height: `${h * 0.35}%` }} /></div>)}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="text-[10px] text-muted">Pipeline</p>
              {[["Novo lead", 12, "#69A5FF"], ["Em negociação", 8, "#F59E0B"], ["Proposta", 6, "#06B6D4"], ["Fechado", 5, "#22C55E"]].map(([l, n, c]) => (
                <div key={String(l)} className="mt-2"><div className="flex justify-between text-[10px]"><span>{String(l)}</span><span className="text-muted">{String(n)}</span></div>
                  <div className="mt-1 h-1 rounded-full bg-elevated"><div className="h-1 rounded-full" style={{ width: `${Number(n) * 8}%`, background: String(c) }} /></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
