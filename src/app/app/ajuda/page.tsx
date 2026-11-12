import Link from "next/link";
import { BookOpen, KanbanSquare, Mail, Radar, Sparkles, Wallet } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Misc";
import { Faq, FAQ_ITEMS } from "@/components/marketing/Faq";

export const metadata = { title: "Ajuda e suporte" };

const GUIDES = [
  { icon: KanbanSquare, title: "Primeiros passos no CRM", text: "Cadastre leads em Contatos, envie para o CRM e arraste os cards entre as etapas. Cada mudança fica registrada na linha do tempo.", href: "/app/crm" },
  { icon: Radar, title: "Prospectando com o Hunter", text: "Pesquise por cidade e segmento, avalie o score de oportunidade, salve o lead e envie para o CRM com um clique.", href: "/app/hunter" },
  { icon: Wallet, title: "Controle financeiro correto", text: "Lance receitas como pendentes e marque como recebidas quando o dinheiro entrar. Só valores efetivados contam no lucro.", href: "/app/financeiro" },
  { icon: Sparkles, title: "Usando o Blusk AI", text: "Escolha entre os assistentes geral, comercial e de projetos. No comercial, selecione um lead para receber uma análise personalizada.", href: "/app/ai" },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Ajuda e suporte" description="Guias rápidos, perguntas frequentes e contato com o time." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GUIDES.map((g) => (
          <Link key={g.title} href={g.href} className="card p-5 transition hover:border-brand/40">
            <g.icon className="h-5 w-5 text-brand-light" />
            <h3 className="mt-3 font-semibold">{g.title}</h3>
            <p className="mt-1 text-sm text-muted">{g.text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5" />Perguntas frequentes</h2>
          <Faq items={FAQ_ITEMS} />
        </div>
        <Card className="h-fit p-6">
          <Mail className="h-5 w-5 text-brand-light" />
          <h3 className="mt-3 font-semibold">Fale com o suporte</h3>
          <p className="mt-1 text-sm text-muted">Envie sua dúvida com o máximo de detalhes (tela, passo a passo e prints). Respondemos em até 1 dia útil.</p>
          <a href="mailto:suporte@bluskdesign.com?subject=Suporte%20Blusk%20Design" className="mt-4 inline-flex text-sm font-medium text-brand-light hover:underline">suporte@bluskdesign.com</a>
        </Card>
      </div>
    </>
  );
}
