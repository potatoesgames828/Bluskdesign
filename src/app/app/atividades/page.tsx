import Link from "next/link";
import { Activity } from "lucide-react";
import { requireSession } from "@/lib/session";
import { Card, EmptyState, PageHeader } from "@/components/ui/Misc";
import { ActivityList } from "@/components/app/ActivityList";
import type { ActivityLog } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Atividades" };
const ENT = [["", "Todas"], ["client", "Clientes"], ["lead", "Leads"], ["opportunity", "Negociações"], ["project", "Projetos"], ["task", "Tarefas"], ["transaction", "Pagamentos"]];
const PAGE = 30;

export default async function ActivitiesPage({ searchParams }: { searchParams: { e?: string; page?: string } }) {
  const { supabase } = await requireSession();
  const page = Math.max(0, Number(searchParams.page ?? 0) || 0);
  let q = supabase.from("activity_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  if (searchParams.e) q = q.eq("entity", searchParams.e);
  const { data, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (p: number) => `/app/atividades?${new URLSearchParams({ ...(searchParams.e ? { e: searchParams.e } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Atividades" description="Registro de tudo o que acontece na sua operação." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ENT.map(([k, l]) => <Link key={k} href={k ? `/app/atividades?e=${k}` : "/app/atividades"} className={cn("rounded-lg px-3 py-1.5 text-sm", (searchParams.e ?? "") === k ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-elevated")}>{l}</Link>)}
      </div>
      <Card>
        {data?.length ? <ActivityList items={data as ActivityLog[]} /> : <EmptyState icon={Activity} title="Nenhuma atividade" description="Crie clientes, leads, projetos ou lançamentos para ver o histórico aqui." />}
      </Card>
      {pages > 1 && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 0 ? <Link href={href(page - 1)} className="text-brand-light">← Anteriores</Link> : <span />}
          <span className="text-muted">Página {page + 1} de {pages}</span>
          {page + 1 < pages ? <Link href={href(page + 1)} className="text-brand-light">Próximas →</Link> : <span />}
        </div>
      )}
    </>
  );
}
