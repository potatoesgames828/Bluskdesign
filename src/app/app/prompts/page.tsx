import { requireSession, hasFeature } from "@/lib/session";
import { UpgradeGate } from "@/components/app/UpgradeGate";
import { aiConfigured } from "@/lib/ai";
import { PromptGenerator } from "./generator";

export const metadata = { title: "Gerador de prompts" };

export default async function PromptsPage() {
  const { plan } = await requireSession();
  if (!hasFeature(plan, "prompts")) return <UpgradeGate title="Gerador de prompts" description="Gere prompts profissionais e estruturados para sites, apps, motion, anúncios e muito mais a partir do plano Pro." />;
  return <PromptGenerator configured={aiConfigured()} />;
}
