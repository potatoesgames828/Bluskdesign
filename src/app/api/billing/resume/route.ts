import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export async function POST() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const sub = s.subscription;
  if (!sub?.provider_subscription_id || sub.provider !== "stripe") return NextResponse.json({ error: "Nenhuma assinatura paga." }, { status: 400 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 503 });
  await getStripe().subscriptions.update(sub.provider_subscription_id, { cancel_at_period_end: false });
  return NextResponse.json({ ok: true, message: "Assinatura reativada." });
}
