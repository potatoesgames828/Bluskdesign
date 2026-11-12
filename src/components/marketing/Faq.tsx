"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((it, i) => (
        <div key={it.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open === i}>
            <span className="font-medium">{it.q}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open === i && "rotate-180")} />
          </button>
          <div className={cn("grid transition-all duration-300", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-relaxed text-muted">{it.a}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const FAQ_ITEMS = [
  { q: "O que é a Blusk Design?", a: "Uma plataforma que reúne inteligência artificial, prospecção comercial, CRM, gestão de clientes e projetos, portfólio e controle financeiro em um só lugar — para quem cria, vende e entrega serviços digitais." },
  { q: "Os indicadores do painel são reais?", a: "Sim. Todos os números do dashboard e dos relatórios são calculados a partir dos registros que você cadastra. Quando não há dados, a plataforma mostra um estado vazio com orientações — nunca números simulados." },
  { q: "Como o lucro líquido é calculado?", a: "Lucro líquido = receitas efetivamente recebidas − despesas efetivamente pagas no período. Valores pendentes aparecem separadamente como contas a receber ou a pagar e não entram no lucro." },
  { q: "De onde vêm os dados do Blusk Hunter?", a: "Da Google Places API (Google Maps Platform), com indicação da fonte e da data de verificação em cada resultado. A qualificação usa apenas dados públicos retornados e deixa claro que a ausência de site na fonte não comprova que a empresa não tenha um." },
  { q: "Meus dados ficam isolados de outros usuários?", a: "Sim. Cada registro pertence à sua conta e é protegido por políticas de Row Level Security no banco de dados: nenhum outro usuário consegue ler ou alterar suas informações." },
  { q: "Posso mudar ou cancelar meu plano a qualquer momento?", a: "Sim. Upgrades são aplicados após a confirmação do pagamento e cancelamentos mantêm o acesso até o fim do período já pago. Depois disso, a conta volta ao plano Free sem perder os dados." },
  { q: "Quais formas de pagamento são aceitas?", a: "Os pagamentos são processados pelo Stripe (cartão de crédito). O status da assinatura é validado no servidor por webhooks — não dependemos de informações enviadas pelo navegador." },
  { q: "A IA usa meus dados para treinar modelos?", a: "As mensagens são enviadas ao provedor de IA apenas para gerar a resposta solicitada, pelo nosso servidor. Suas chaves e dados nunca são expostos no navegador." },
];
