import "server-only";
import Stripe from "stripe";

let stripe: Stripe | null = null;
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_ELITE);
}
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurada");
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}
export function priceFor(plan: "pro" | "elite") {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO! : process.env.STRIPE_PRICE_ELITE!;
}
export function planForPrice(priceId: string | undefined | null): "pro" | "elite" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "elite";
  return null;
}
