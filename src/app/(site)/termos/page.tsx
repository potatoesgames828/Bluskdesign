import { LegalPage } from "@/components/marketing/LegalPage";
export const metadata = { title: "Termos de uso" };
export default function Terms() {
  return <LegalPage title="Termos de uso" updated="12 de novembro de 2026" sections={[
    { h: "Aceitação", p: ["Ao criar uma conta ou utilizar a Blusk Design, você concorda com estes Termos. Se não concordar, não utilize a plataforma."] },
    { h: "Conta e segurança", p: ["Você é responsável pela veracidade dos dados informados e pela confidencialidade da sua senha.", "Notifique-nos imediatamente sobre qualquer uso não autorizado da sua conta."] },
    { h: "Uso permitido", p: ["É proibido utilizar a plataforma para atividades ilícitas, envio de spam, coleta abusiva de dados ou violação de direitos de terceiros.", "Os dados de prospecção são obtidos de fontes públicas oficiais (como a Google Places API) e devem ser usados em conformidade com a LGPD e com as políticas das respectivas fontes."] },
    { h: "Planos e pagamentos", p: ["Os planos pagos são cobrados mensalmente de forma recorrente via processador de pagamentos. O cancelamento mantém o acesso até o fim do período pago.", "Os limites de cada plano podem ser ajustados mediante aviso prévio."] },
    { h: "Conteúdo gerado por IA", p: ["Respostas de inteligência artificial podem conter imprecisões. Revise o conteúdo antes de utilizá-lo comercialmente."] },
    { h: "Propriedade dos dados", p: ["Os dados que você cadastra pertencem a você. Você pode exportá-los ou solicitar a exclusão da conta a qualquer momento."] },
    { h: "Limitação de responsabilidade", p: ["A plataforma é fornecida “como está”. Não nos responsabilizamos por decisões comerciais tomadas com base nas informações exibidas."] },
    { h: "Contato", p: ["Dúvidas sobre estes Termos: contato@bluskdesign.com."] },
  ]} />;
}
