import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hasFeature, consumeUsage } from "@/lib/session";
import { complete, AIError, SYSTEM_PROMPTS } from "@/lib/ai";

const Body = z.object({
  conversationId: z.string().uuid().optional(),
  assistant: z.enum(["general", "sales", "projects"]).default("general"),
  message: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasFeature(s.plan, "ai")) return NextResponse.json({ error: "O Blusk AI está disponível a partir do plano Pro." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  const { assistant, message } = parsed.data;
  const db = s.supabase;

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data } = await db.from("ai_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  } else {
    const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
    const { data, error } = await db.from("ai_conversations").insert({ title, assistant }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    conversationId = data.id;
  }

  if (!(await consumeUsage("ai_messages", s.plan))) {
    return NextResponse.json({ error: "Limite mensal de mensagens do seu plano atingido.", conversationId }, { status: 429 });
  }

  const { data: history } = await db.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at").limit(40);
  const { error: insErr } = await db.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  try {
    const reply = await complete({
      system: SYSTEM_PROMPTS[assistant],
      messages: [...((history ?? []) as { role: "user" | "assistant"; content: string }[]), { role: "user", content: message }],
    });
    const { data: saved } = await db.from("ai_messages").insert({ conversation_id: conversationId, role: "assistant", content: reply }).select("*").single();
    await db.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ conversationId, message: saved });
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500;
    const msg = e instanceof Error ? e.message : "Erro ao consultar a IA.";
    return NextResponse.json({ error: msg, conversationId }, { status });
  }
}
