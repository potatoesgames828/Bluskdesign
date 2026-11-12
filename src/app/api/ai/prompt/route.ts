import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hasFeature, consumeUsage } from "@/lib/session";
import { complete, AIError, SYSTEM_PROMPTS } from "@/lib/ai";
import { PROMPT_CATEGORIES } from "@/lib/constants";

const Body = z.object({
  category: z.string().refine((c) => PROMPT_CATEGORIES.some((x) => x.id === c), "Categoria inválida"),
  objective: z.string().trim().min(5).max(4000),
  options: z.object({
    audience: z.string().max(300).optional(),
    tone: z.string().max(100).optional(),
    detail: z.enum(["conciso", "detalhado", "muito detalhado"]).optional(),
    tech: z.string().max(300).optional(),
    extra: z.string().max(2000).optional(),
  }).default({}),
  refine: z.object({ previous: z.string().max(30000), instruction: z.string().trim().min(2).max(2000) }).optional(),
  save: z.boolean().default(true),
});

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasFeature(s.plan, "prompts")) return NextResponse.json({ error: "O Gerador de prompts está disponível a partir do plano Pro." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { category, objective, options, refine } = parsed.data;
  if (!(await consumeUsage("prompt_generations", s.plan))) return NextResponse.json({ error: "Limite mensal de gerações do seu plano atingido." }, { status: 429 });

  const label = PROMPT_CATEGORIES.find((c) => c.id === category)!.label;
  const brief = [
    `Categoria: ${label}`,
    `Objetivo do usuário: ${objective}`,
    options.audience && `Público-alvo: ${options.audience}`,
    options.tone && `Tom desejado: ${options.tone}`,
    options.detail && `Nível de detalhe: ${options.detail}`,
    options.tech && `Tecnologias/ferramentas: ${options.tech}`,
    options.extra && `Requisitos adicionais: ${options.extra}`,
  ].filter(Boolean).join("\n");

  try {
    const content = await complete({
      system: SYSTEM_PROMPTS.prompts,
      maxTokens: 12000,
      messages: refine
        ? [{ role: "user", content: brief }, { role: "assistant", content: refine.previous }, { role: "user", content: `Refine o prompt acima: ${refine.instruction}. Responda somente com o prompt final completo.` }]
        : [{ role: "user", content: brief }],
    });
    let saved = null;
    if (parsed.data.save) {
      const { data } = await s.supabase.from("saved_prompts").insert({ category, objective, options, content }).select("*").single();
      saved = data;
    }
    return NextResponse.json({ content, saved });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: e instanceof AIError ? e.status : 500 });
  }
}
