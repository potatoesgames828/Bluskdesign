import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getStripe, priceFor, stripeConfigured } from "@/lib/stripe";

const Body = z.object({ plan: z.enum(["pro", "elite"]) });

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Pagamentos ainda não configurados (Stripe). Consulte o README para habilitar." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

  const stripe = getStripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const sub = s.subscription;

  // Já possui assinatura ativa no Stripe → troca de plano na própria assinatura
  if (sub?.provider === "stripe" && sub.provider_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) {
    const current = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
    await stripe.subscriptions.update(current.id, {
      items: [{ id: current.items.data[0].id, price: priceFor(parsed.data.plan) }],
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      metadata: { user_id: s.user.id, plan: parsed.data.plan },
    });
    return NextResponse.json({ updated: true, message: "Alteração enviada. O plano será atualizado assim que o pagamento for confirmado." });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceFor(parsed.data.plan), quantity: 1 }],
    customer: sub?.provider_customer_id ?? undefined,
    customer_email: sub?.provider_customer_id ? undefined : s.user.email,
    client_reference_id: s.user.id,
    metadata: { user_id: s.user.id, plan: parsed.data.plan },
    subscription_data: { metadata: { user_id: s.user.id, plan: parsed.data.plan } },
    success_url: `${site}/app/assinatura?checkout=success`,
    cancel_url: `${site}/app/assinatura?checkout=cancel`,
    locale: "pt-BR",
  });
  return NextResponse.json({ url: session.url });
}
