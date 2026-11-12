"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { errorMessage } from "@/lib/utils";

const LIMIT_KEYS = ["clients", "leads", "opportunities", "projects", "portfolio_items", "ai_messages_month", "prompt_generations_month", "hunter_searches_month"];
const FEATURE_KEYS = ["ai", "prompts", "hunter", "advanced_reports", "advanced_projects"];

export function PlansEditor({ plans }: { plans: Plan[] }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useFeedback();
  const [state, setState] = useState(plans);
  const [saving, setSaving] = useState<string | null>(null);
  const upd = (id: string, fn: (p: Plan) => Plan) => setState((s) => s.map((p) => (p.id === id ? fn(p) : p)));

  async function save(p: Plan) {
    setSaving(p.id);
    const { error } = await supabase.from("plans").update({ price_cents: p.price_cents, limits: p.limits, features: p.features, description: p.description }).eq("id", p.id);
    setSaving(null);
    if (error) return toast(errorMessage(error), "error");
    toast(`Plano ${p.name} atualizado.`); router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {state.map((p) => (
        <div key={p.id} className="rounded-xl border border-line p-4">
          <p className="font-semibold">{p.name}</p>
          <label className="mt-3 block text-xs text-muted">Preço (centavos)</label>
          <input type="number" min={0} className="input mt-1 h-8 py-1 text-sm" value={p.price_cents} onChange={(e) => upd(p.id, (x) => ({ ...x, price_cents: Math.max(0, Number(e.target.value)) }))} />
          <p className="mt-3 text-xs font-medium text-muted">Recursos</p>
          {FEATURE_KEYS.map((k) => (
            <label key={k} className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[#3478F6]" checked={Boolean(p.features[k])} onChange={(e) => upd(p.id, (x) => ({ ...x, features: { ...x.features, [k]: e.target.checked } }))} />{k}</label>
          ))}
          <p className="mt-3 text-xs font-medium text-muted">Limites</p>
          {LIMIT_KEYS.map((k) => (
            <div key={k} className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{k}</span>
              <input type="number" min={0} className="input h-7 w-24 py-0 text-xs" value={Number(p.limits[k] ?? 0)} onChange={(e) => upd(p.id, (x) => ({ ...x, limits: { ...x.limits, [k]: Math.max(0, Number(e.target.value)) } }))} />
            </div>
          ))}
          <Button size="sm" className="mt-4 w-full" loading={saving === p.id} onClick={() => save(p)}>Salvar</Button>
        </div>
      ))}
    </div>
  );
}

export function UserPlanSelect({ userId, plan, provider }: { userId: string; plan: string; provider: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  return (
    <select defaultValue={plan} className="rounded-lg border border-line bg-bg px-2 py-1 text-xs" aria-label="Plano do usuário"
      onChange={async (e) => {
        const v = e.target.value;
        if (provider === "stripe" && !(await confirm({ title: "Alterar plano manualmente?", description: "Este usuário tem assinatura no Stripe; o próximo webhook pode sobrescrever a alteração.", confirmLabel: "Alterar" }))) { e.target.value = plan; return; }
        const { error } = await supabase.from("subscriptions").update({ plan_id: v, status: "active", provider: provider ?? "manual" }).eq("user_id", userId);
        if (error) { toast(errorMessage(error), "error"); e.target.value = plan; return; }
        toast("Plano do usuário atualizado."); router.refresh();
      }}>
      <option value="free">Free</option><option value="pro">Pro</option><option value="elite">Elite</option>
    </select>
  );
}
