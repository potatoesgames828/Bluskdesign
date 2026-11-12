import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Plan, Profile, Subscription } from "./types";

export const getSession = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const active = subscription && ["active", "trialing"].includes(subscription.status);
  const planId = active ? (subscription!.plan_id as Plan["id"]) : "free";
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
  return {
    supabase,
    user,
    profile: profile as Profile,
    subscription: subscription as Subscription | null,
    plan: plan as Plan,
  };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireAdmin() {
  const s = await requireSession();
  if (s.profile?.role !== "admin") redirect("/app");
  return s;
}

export type FeatureKey = "ai" | "prompts" | "hunter" | "advanced_reports" | "advanced_projects";

export function hasFeature(plan: Plan | null | undefined, f: FeatureKey) {
  return Boolean(plan?.features?.[f]);
}

/** Consome 1 unidade da cota mensal. Retorna false se o limite foi atingido. */
export async function consumeUsage(feature: string, plan: Plan) {
  const s = await getSession();
  if (!s) return false;
  const limit = Number(plan.limits?.[`${feature}_month`] ?? 0);
  if (limit <= 0) return false;
  const { data, error } = await s.supabase.rpc("consume_usage", { p_feature: feature, p_limit: limit });
  if (error) throw error;
  return (data as number) >= 0;
}
