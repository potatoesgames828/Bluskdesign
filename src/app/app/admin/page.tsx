import { requireAdmin } from "@/lib/session";
import { Card, CardHeader, PageHeader, StatCard, Badge } from "@/components/ui/Misc";
import { Users, UserPlus, Wallet, Contact, KanbanSquare, FolderKanban } from "lucide-react";
import type { Plan } from "@/lib/types";
import { PlansEditor, UserPlanSelect } from "./client";
import { date } from "@/lib/utils";

export const metadata = { title: "Administração" };

export default async function AdminPage({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase } = await requireAdmin();
  const q = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim();
  let users = supabase.from("profiles").select("id,full_name,email,role,created_at").order("created_at", { ascending: false }).limit(100);
  if (q) users = users.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data: overview }, { data: profiles }, { data: subs }, { data: plans }] = await Promise.all([
    supabase.rpc("admin_overview"),
    users,
    supabase.from("subscriptions").select("user_id,plan_id,status,provider,current_period_end,cancel_at_period_end"),
    supabase.from("plans").select("*").order("sort_order"),
  ]);
  const o = (overview ?? {}) as { users?: number; users_30d?: number; by_plan?: Record<string, number>; revenue_cents_30d?: number; clients?: number; leads?: number; opportunities?: number; projects?: number; usage?: Record<string, number> };
  const subOf = (id: string) => subs?.find((s) => s.user_id === id);

  return (
    <>
      <PageHeader title="Administração" description="Indicadores gerais, usuários, assinaturas, planos e limites." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Usuários" value={o.users ?? 0} icon={Users} />
        <StatCard label="Novos (30 dias)" value={o.users_30d ?? 0} icon={UserPlus} tone="green" />
        <StatCard label="Receita (30 dias)" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((o.revenue_cents_30d ?? 0) / 100)} icon={Wallet} tone="purple" />
        <StatCard label="Leads na plataforma" value={o.leads ?? 0} icon={Contact} tone="yellow" />
        <StatCard label="Oportunidades" value={o.opportunities ?? 0} icon={KanbanSquare} />
        <StatCard label="Projetos" value={o.projects ?? 0} icon={FolderKanban} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Assinaturas por plano" />
          <ul className="space-y-2 p-5 text-sm">{["free", "pro", "elite"].map((p) => <li key={p} className="flex justify-between"><span className="uppercase text-muted">{p}</span><span className="tabular-nums">{o.by_plan?.[p] ?? 0}</span></li>)}</ul>
          <CardHeader title="Utilização no mês" />
          <ul className="space-y-2 p-5 text-sm">
            {Object.keys(o.usage ?? {}).length === 0 && <li className="text-muted">Sem uso registrado.</li>}
            {Object.entries(o.usage ?? {}).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="tabular-nums">{v}</span></li>)}
          </ul>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Planos e limites" subtitle="Alterações valem imediatamente para todos os usuários do plano." />
          <div className="p-5"><PlansEditor plans={(plans ?? []) as Plan[]} /></div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Usuários" subtitle="Últimos 100 cadastros" action={
          <form action="/app/admin"><input name="q" defaultValue={q} placeholder="Buscar nome ou e-mail" className="input h-9 w-56 py-1 text-sm" /></form>} />
        <div className="table-wrap m-4 mt-3">
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Cadastro</th><th>Papel</th><th>Assinatura</th><th>Plano</th></tr></thead>
            <tbody>
              {(profiles ?? []).map((u) => {
                const s = subOf(u.id);
                return (
                  <tr key={u.id}>
                    <td><p className="font-medium">{u.full_name || "—"}</p><p className="text-xs text-muted">{u.email}</p></td>
                    <td>{date(u.created_at)}</td>
                    <td><Badge tone={u.role === "admin" ? "purple" : "neutral"}>{u.role}</Badge></td>
                    <td className="text-xs text-muted">{s ? `${s.status} · ${s.provider ?? "—"}${s.current_period_end ? ` · até ${date(s.current_period_end)}` : ""}` : "—"}</td>
                    <td><UserPlanSelect userId={u.id} plan={s?.plan_id ?? "free"} provider={s?.provider ?? null} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
