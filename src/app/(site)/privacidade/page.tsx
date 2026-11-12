import { LegalPage } from "@/components/marketing/LegalPage";
export const metadata = { title: "Política de privacidade" };
export default function Privacy() {
  return <LegalPage title="Política de privacidade" updated="12 de novembro de 2026" sections={[
    { h: "Dados que coletamos", p: ["Dados de cadastro (nome, e-mail, foto), dados que você insere na plataforma (clientes, leads, projetos, lançamentos) e dados técnicos necessários ao funcionamento (logs de acesso)."] },
    { h: "Como usamos", p: ["Para operar a plataforma, autenticar seu acesso, processar pagamentos, enviar notificações e melhorar o serviço. Não vendemos seus dados."] },
    { h: "Isolamento e segurança", p: ["Cada registro é vinculado à sua conta e protegido por políticas de Row Level Security no banco de dados. Chaves de integração ficam apenas no servidor."] },
    { h: "Compartilhamento com operadores", p: ["Utilizamos provedores para hospedagem e banco de dados (Supabase/Vercel), pagamentos (Stripe), inteligência artificial (Anthropic) e mapas/empresas (Google Maps Platform), apenas na medida necessária para cada funcionalidade."] },
    { h: "Seus direitos (LGPD)", p: ["Você pode acessar, corrigir, exportar ou excluir seus dados e revogar consentimentos. Solicite pelo e-mail privacidade@bluskdesign.com."] },
    { h: "Retenção", p: ["Mantemos os dados enquanto a conta estiver ativa. Após a exclusão da conta, os dados são removidos, exceto quando houver obrigação legal de guarda."] },
    { h: "Cookies", p: ["Usamos cookies essenciais para manter sua sessão autenticada."] },
  ]} />;
}
