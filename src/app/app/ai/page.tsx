import { requireSession, hasFeature } from "@/lib/session";
import { aiConfigured } from "@/lib/ai";
import { UpgradeGate } from "@/components/app/UpgradeGate";
import { AiWorkspace } from "./workspace";

export const metadata = { title: "Blusk AI" };

export default async function AiPage({ searchParams }: { searchParams: { a?: string } }) {
  const { plan, supabase } = await requireSession();
  if (!hasFeature(plan, "ai")) return <UpgradeGate title="Blusk AI" description="Assistente de IA, assistente comercial e assistente de projetos estão disponíveis a partir do plano Pro." />;
  const period = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase.from("usage_counters").select("count").eq("feature", "ai_messages").eq("period", period).maybeSingle();
  const assistant = (["general", "sales", "projects"].includes(searchParams.a ?? "") ? searchParams.a : "general") as "general" | "sales" | "projects";
  return <AiWorkspace configured={aiConfigured()} initialAssistant={assistant} used={usage?.count ?? 0} limit={Number(plan.limits.ai_messages_month ?? 0)} />;
}
