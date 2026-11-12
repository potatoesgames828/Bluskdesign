import Link from "next/link";
import { ArrowRight, BarChart3, Bot, Building2, CheckCircle2, FolderKanban, KanbanSquare, LineChart, Lock, MapPinned, Radar, Search, ShieldCheck, Smartphone, Sparkles, Wallet, Wand2, Zap, Bell, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { Faq, FAQ_ITEMS } from "@/components/marketing/Faq";
import { PlanFeatures, formatPrice } from "@/components/marketing/PlanCards";
import type { Plan } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

const FALLBACK_PLANS = [
  { id: "free", name: "Free", description: "Para começar a organizar sua operação.", price_cents: 0, currency: "BRL" },
  { id: "pro", name: "Pro", description: "Inteligência artificial e relatórios completos.", price_cents: 4990, currency: "BRL" },
  { id: "elite", name: "Elite", description: "Prospecção inteligente e limites ampliados.", price_cents: 9990, currency: "BRL" },
] as Plan[];

async function getPlans(): Promise<Plan[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return FALLBACK_PLANS;
  try {
    const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } }).from("plans").select("*").order("sort_order");
    return (data as Plan[])?.length ? (data as Plan[]) : FALLBACK_PLANS;
  } catch { return FALLBACK_PLANS; }
}

const MODULES = [
  { icon: Sparkles, title: "Inteligência artificial", text: "Assistentes de IA para conteúdo, vendas e projetos, além de um gerador de prompts profissional com histórico e favoritos.", tag: "Blusk AI" },
  { icon: Radar, title: "Prospecção comercial", text: "Encontre empresas por cidade e segmento, veja no mapa e receba um score de oportunidade com justificativa.", tag: "Blusk Hunter" },
  { icon: KanbanSquare, title: "CRM", text: "Pipeline Kanban com arrastar e soltar, histórico completo de cada negociação, lembretes e indicadores.", tag: "Vendas" },
  { icon: FolderKanban, title: "Gestão de projetos", text: "Projetos com tarefas, prazos, progresso automático, alertas de atraso e lucro estimado.", tag: "Blusk Projects" },
  { icon: Wallet, title: "Controle financeiro", text: "Receitas, despesas, contas a pagar e receber, fluxo de caixa e relatórios com lucro real.", tag: "Blusk Finance" },
];

const STEPS = [
  { icon: Search, title: "Encontre oportunidades", text: "Pesquise empresas por região e segmento com o Blusk Hunter." },
  { icon: Users, title: "Cadastre potenciais clientes", text: "Salve leads com prioridade, observações e data de contato." },
  { icon: KanbanSquare, title: "Organize negociações", text: "Mova as oportunidades pelo pipeline até o fechamento." },
  { icon: FolderKanban, title: "Desenvolva projetos", text: "Transforme vendas em projetos com tarefas e prazos." },
  { icon: LineChart, title: "Acompanhe resultados", text: "Veja receita, lucro e conversão com dados reais." },
];

const FEATURES = [
  { icon: BarChart3, title: "Indicadores reais", text: "Nada de números aleatórios: tudo é calculado a partir dos seus registros." },
  { icon: MapPinned, title: "Mapa interativo", text: "Resultados de prospecção sincronizados entre lista e mapa." },
  { icon: Bot, title: "Assistente comercial", text: "Mensagens de abordagem, propostas, objeções e próximos passos." },
  { icon: Wand2, title: "Gerador de prompts", text: "Prompts estruturados para sites, apps, motion, anúncios e mais." },
  { icon: Bell, title: "Notificações inteligentes", text: "Novos leads, prazos próximos, projetos atrasados e pagamentos." },
  { icon: ShieldCheck, title: "Dados isolados", text: "Row Level Security garante que cada conta veja apenas seus dados." },
  { icon: Smartphone, title: "Pensado para o celular", text: "Menus, tabelas e formulários adaptados a qualquer tela." },
  { icon: Zap, title: "Ações rápidas", text: "Crie leads, clientes, projetos e lançamentos de qualquer lugar." },
];

export default async function Home() {
  const plans = await getPlans();
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs text-muted animate-fade-up"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Criar, prospectar, organizar e vender</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight animate-fade-up sm:text-6xl lg:text-7xl">
            Seu negócio digital. Mais <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">inteligente</span>, organizado e preparado para crescer.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted animate-fade-up sm:text-lg">Crie, prospecte, gerencie e desenvolva seu negócio com ferramentas inteligentes em uma única plataforma.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 animate-fade-up sm:flex-row">
            <Link href="/cadastro" className={buttonClass("primary", "lg")}>Começar agora <ArrowRight className="h-4 w-4" /></Link>
            <a href="#ecossistema" className={buttonClass("secondary", "lg")}>Conhecer a plataforma</a>
          </div>
          <p className="mt-4 text-xs text-muted">Plano Free para sempre · sem cartão de crédito</p>
          <div className="relative mx-auto mt-16 max-w-6xl animate-fade-up"><div className="animate-float"><DashboardPreview /></div></div>
        </div>
      </section>

      {/* ECOSSISTEMA */}
      <section id="ecossistema" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand-light">Ecossistema</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Cinco módulos. Uma operação.</h2>
          <p className="mt-3 text-muted">Tudo conectado: o lead vira oportunidade, a oportunidade vira cliente, o cliente vira projeto e o projeto vira receita.</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <div key={m.title} className={`card group relative overflow-hidden p-6 transition hover:border-brand/40 ${i === 0 ? "lg:col-span-2" : ""}`}>
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl transition group-hover:bg-brand/20" />
              <div className="relative">
                <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-light"><m.icon className="h-5 w-5" /></span><span className="chip">{m.tag}</span></div>
                <h3 className="mt-5 text-lg font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.text}</p>
              </div>
            </div>
          ))}
          <div className="card flex flex-col justify-between bg-gradient-to-br from-brand/20 to-transparent p-6">
            <Building2 className="h-6 w-6 text-brand-light" />
            <div><h3 className="mt-5 text-lg font-semibold">Clientes e portfólio</h3><p className="mt-2 text-sm text-muted">Perfil completo de cada cliente com projetos, pagamentos, arquivos e histórico — e um portfólio organizado dos seus trabalhos.</p></div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-line bg-surface/40 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-medium text-brand-light">Como funciona</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Do primeiro contato ao resultado</h2></div>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-line bg-bg p-5">
                <span className="font-display text-4xl font-extrabold text-line">{String(i + 1).padStart(2, "0")}</span>
                <s.icon className="mt-3 h-5 w-5 text-brand-light" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-medium text-brand-light">Recursos</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Feito para quem vende e entrega</h2></div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-bg p-6 transition hover:bg-surface">
              <f.icon className="h-5 w-5 text-brand-light" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMONSTRAÇÃO */}
      <section id="demonstracao" className="scroll-mt-20 border-y border-line bg-surface/40 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-brand-light">Demonstração</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Veja sua operação inteira em um painel</h2>
            <p className="mt-4 text-muted">Receita recebida, despesas pagas, lucro líquido, clientes ativos, projetos em andamento, leads e taxa de conversão — com filtros de período e gráficos de evolução.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Filtros: hoje, 7, 30 e 90 dias, ano ou período personalizado", "Pipeline com arrastar e soltar e linha do tempo", "Fluxo de caixa com saldo acumulado", "Alertas de prazos e pagamentos pendentes"].map((t) => <li key={t} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />{t}</li>)}
            </ul>
            <p className="mt-6 text-xs text-muted">As imagens ao lado usam dados demonstrativos, apenas para ilustração.</p>
          </div>
          <DashboardPreview compact />
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-medium text-brand-light">Planos</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Comece grátis. Evolua quando quiser.</h2><p className="mt-3 text-muted">Sem fidelidade. Cancele quando quiser.</p></div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const featured = p.id === "pro";
            return (
              <div key={p.id} className={`card relative flex flex-col p-7 ${featured ? "border-brand shadow-glow" : ""}`}>
                {featured && <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-white">Mais escolhido</span>}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.description}</p>
                <p className="mt-6 font-display text-4xl font-extrabold">{formatPrice(p)}<span className="text-sm font-normal text-muted">{p.price_cents ? " /mês" : ""}</span></p>
                <PlanFeatures id={p.id} className="mt-6 flex-1" />
                <Link href="/cadastro" className={buttonClass(featured ? "primary" : "secondary", "lg", "mt-8 w-full")}>{p.price_cents ? `Assinar ${p.name}` : "Criar conta grátis"}</Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted"><Lock className="h-3 w-3" />Pagamentos processados com segurança pelo Stripe. Limites detalhados disponíveis na área de assinatura.</p>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center"><p className="text-sm font-medium text-brand-light">FAQ</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Perguntas frequentes</h2></div>
          <div className="mt-12"><Faq items={FAQ_ITEMS} /></div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/25 via-surface to-surface px-6 py-16 text-center sm:px-16">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold sm:text-5xl">Pronto para organizar e crescer?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">Crie sua conta grátis em menos de um minuto e comece a usar hoje.</p>
            <Link href="/cadastro" className={buttonClass("primary", "lg", "mt-8")}>Criar minha conta <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
