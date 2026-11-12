import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForPrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Webhook Stripe — ÚNICA fonte de verdade para o estado da assinatura.
 * Eventos: checkout.session.completed, customer.subscription.created|updated|deleted, invoice.paid, invoice.payment_failed
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const db = createAdminClient();

  async function syncSubscription(sub: Stripe.Subscription) {
    const userId = sub.metadata?.user_id;
    if (!userId) return;
    const item = sub.items.data[0];
    const plan = planForPrice(item?.price?.id) ?? "free";
    const statusMap: Record<string, string> = { active: "active", trialing: "trialing", past_due: "past_due", canceled: "canceled", unpaid: "past_due", incomplete: "incomplete", incomplete_expired: "canceled", paused: "past_due" };
    const status = statusMap[sub.status] ?? "incomplete";
    const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    const ended = status === "canceled";
    const { data: before } = await db.from("subscriptions").select("plan_id,status").eq("user_id", userId).maybeSingle();
    await db.from("subscriptions").upsert({
      user_id: userId,
      plan_id: ended ? "free" : plan,
      status: ended ? "active" : status,
      provider: "stripe",
      provider_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      provider_subscription_id: ended ? null : sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    }, { onConflict: "user_id" });
    const newPlan = ended ? "free" : plan;
    if (before?.plan_id !== newPlan || before?.status !== (ended ? "active" : status)) {
      await db.from("notifications").insert({
        user_id: userId, type: "subscription_change", category: "account", title: "Alteração de assinatura",
        body: ended ? "Sua assinatura foi encerrada. Você está no plano Free." : `Plano ${newPlan.toUpperCase()} — status ${status}.`, link: "/app/assinatura",
      });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.subscription) await syncSubscription(await stripe.subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = (inv as unknown as { subscription?: string | { id: string } }).subscription
          ?? (inv as unknown as { parent?: { subscription_details?: { subscription?: string } } }).parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await db.from("payments").upsert({
          user_id: userId, plan_id: planForPrice(sub.items.data[0]?.price?.id), amount_cents: inv.amount_paid || inv.amount_due,
          currency: (inv.currency ?? "brl").toUpperCase(), status: event.type === "invoice.paid" ? "paid" : "failed", provider: "stripe",
          provider_payment_id: inv.id, paid_at: event.type === "invoice.paid" ? new Date().toISOString() : null,
        }, { onConflict: "provider_payment_id" });
        await syncSubscription(sub);
        break;
      }
    }
  } catch (e) {
    console.error("[stripe-webhook]", e);
    return NextResponse.json({ error: "Falha ao processar evento." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
