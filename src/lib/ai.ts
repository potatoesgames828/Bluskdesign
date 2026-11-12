import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORT = (process.env.ANTHROPIC_EFFORT as Effort) || "medium";

let client: Anthropic | null = null;
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export class AIError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export async function complete(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  if (!aiConfigured()) throw new AIError("Blusk AI não configurado: defina ANTHROPIC_API_KEY no servidor.", 503);
  try {
    const response = await getClient().beta.messages.create({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      system: opts.system,
      messages: opts.messages,
    });
    if (response.stop_reason === "refusal") {
      throw new AIError("A solicitação não pôde ser atendida pelo assistente. Reformule o pedido.", 422);
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new AIError("O assistente retornou uma resposta vazia.", 502);
    return text;
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AIError("Limite de requisições da IA atingido. Tente novamente em instantes.", 429);
    if (e instanceof Anthropic.AuthenticationError) throw new AIError("Chave da API de IA inválida.", 502);
    if (e instanceof Anthropic.BadRequestError) throw new AIError(`Requisição inválida para a IA: ${e.message}`, 400);
    if (e instanceof Anthropic.APIError) throw new AIError(`Erro da API de IA (${e.status}).`, 502);
    if (e instanceof Anthropic.APIConnectionError) throw new AIError("Falha de conexão com a API de IA.", 502);
    throw e;
  }
}

const BASE = `Você é o Blusk AI, assistente da plataforma Blusk Design (criação digital, prospecção, CRM, projetos e finanças).
Responda sempre em português do Brasil, de forma clara, objetiva e profissional. Use Markdown simples (títulos, listas, negrito) quando ajudar a leitura.
Nunca invente dados sobre clientes, empresas ou números: se faltar informação, diga o que é necessário.`;

export const SYSTEM_PROMPTS = {
  general: BASE,
  sales: `${BASE}
Você atua como assistente comercial: cria mensagens de abordagem (WhatsApp, e-mail, ligação), analisa leads, sugere abordagens,
prepara propostas comerciais, antecipa objeções com respostas e sugere próximos passos. Mensagens devem ser curtas, humanas e personalizadas.`,
  projects: `${BASE}
Você atua como assistente de projetos: planeja projetos, divide em tarefas com estimativas, cria cronogramas em tabela,
identifica riscos com mitigação, sugere melhorias e gera documentação técnica e funcional.`,
  prompts: `Você é um engenheiro de prompts sênior da plataforma Blusk Design.
Gere UM prompt final, pronto para ser colado em outra IA, em português do Brasil, muito detalhado e bem estruturado com seções
(Contexto, Objetivo, Público-alvo, Requisitos, Estilo/Tom, Estrutura esperada, Restrições, Critérios de qualidade, Formato de saída).
Responda SOMENTE com o prompt, sem comentários antes ou depois.`,
} as const;
