import Link from "next/link";
import { Search } from "lucide-react";
import { requireSession } from "@/lib/session";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Misc";

export const metadata = { title: "Busca" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase } = await requireSession();
  const q = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 80);
  const groups: { title: string; items: { href: string; label: string; sub: string }[] }[] = [];
  if (q) {
    const like = `%${q}%`;
    const [c, l, o, p, t] = await Promise.all([
      supabase.from("clients").select("id,name,company,email").or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`).limit(10),
      supabase.from("leads").select("id,company_name,city,segment").or(`company_name.ilike.${like},contact_name.ilike.${like},city.ilike.${like}`).limit(10),
      supabase.from("opportunities").select("id,title,company").or(`title.ilike.${like},company.ilike.${like}`).limit(10),
      supabase.from("projects").select("id,name,category").or(`name.ilike.${like},description.ilike.${like}`).limit(10),
      supabase.from("project_tasks").select("id,title,project_id").ilike("title", like).limit(10),
    ]);
    groups.push(
      { title: "Clientes", items: (c.data ?? []).map((x) => ({ href: `/app/clientes/${x.id}`, label: x.name, sub: [x.company, x.email].filter(Boolean).join(" · ") })) },
      { title: "Leads", items: (l.data ?? []).map((x) => ({ href: `/app/contatos`, label: x.company_name, sub: [x.segment, x.city].filter(Boolean).join(" · ") })) },
      { title: "Oportunidades", items: (o.data ?? []).map((x) => ({ href: `/app/crm/${x.id}`, label: x.title, sub: x.company ?? "" })) },
      { title: "Projetos", items: (p.data ?? []).map((x) => ({ href: `/app/projetos/${x.id}`, label: x.name, sub: x.category ?? "" })) },
      { title: "Tarefas", items: (t.data ?? []).map((x) => ({ href: x.project_id ? `/app/projetos/${x.project_id}` : "/app/tarefas", label: x.title, sub: "" })) },
    );
  }
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <>
      <PageHeader title="Busca global" description={q ? `${total} resultado(s) para “${q}”` : "Pesquise em clientes, leads, oportunidades, projetos e tarefas."} />
      <form className="relative mb-6" action="/app/busca">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} autoFocus className="input h-12 pl-10 text-base" placeholder="Digite e pressione Enter…" />
      </form>
      {q && total === 0 && <Card><EmptyState icon={Search} title="Nada encontrado" description="Tente outro termo." /></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.filter((g) => g.items.length).map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} subtitle={`${g.items.length} resultado(s)`} />
            <ul className="p-2">{g.items.map((i) => (
              <li key={i.href + i.label}><Link href={i.href} className="block rounded-xl px-3 py-2 hover:bg-elevated"><p className="text-sm font-medium">{i.label}</p>{i.sub && <p className="text-xs text-muted">{i.sub}</p>}</Link></li>
            ))}</ul>
          </Card>
        ))}
      </div>
    </>
  );
}
