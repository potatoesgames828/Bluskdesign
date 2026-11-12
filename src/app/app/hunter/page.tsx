import { requireSession, hasFeature } from "@/lib/session";
import { UpgradeGate } from "@/components/app/UpgradeGate";
import { Hunter } from "./hunter";

export const metadata = { title: "Blusk Hunter" };

export default async function HunterPage() {
  const { plan, profile } = await requireSession();
  if (!hasFeature(plan, "hunter")) return <UpgradeGate plan="Elite" title="Blusk Hunter" description="Encontre empresas por região e segmento, veja-as no mapa, qualifique oportunidades e envie leads direto para o CRM. Disponível no plano Elite." />;
  return <Hunter configured={Boolean(process.env.GOOGLE_PLACES_API_KEY)} weights={(profile.preferences?.hunter_weights ?? {}) as Record<string, number>} />;
}
