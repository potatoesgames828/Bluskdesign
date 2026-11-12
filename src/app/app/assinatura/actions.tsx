"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { errorMessage } from "@/lib/utils";

const ORDER = { free: 0, pro: 1, elite: 2 } as const;

export function SubscriptionActions({ target, current, cancelAtPeriodEnd, paid }: { target: "free" | "pro" | "elite"; current: "free" | "pro" | "elite"; cancelAtPeriodEnd: boolean; paid: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast, confirm } = useFeedback();

  async function call(url: string, body?: object) {
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.url) { window.location.href = json.url; return; }
      toast(json.message ?? "Solicitação enviada.");
      router.refresh();
    } catch (e) { toast(errorMessage(e), "error"); }
    setLoading(false);
  }

  if (target === current) {
    if (target === "free") return <Button variant="secondary" disabled className="mt-5 w-full">Plano atual</Button>;
    return cancelAtPeriodEnd
      ? <Button variant="secondary" className="mt-5 w-full" loading={loading} onClick={() => call("/api/billing/resume")}>Reativar assinatura</Button>
      : <Button variant="danger" className="mt-5 w-full" loading={loading} onClick={async () => {
          if (await confirm({ title: "Cancelar assinatura?", description: "Você manterá o acesso até o fim do período já pago e depois voltará ao plano Free.", confirmLabel: "Cancelar assinatura", danger: true })) call("/api/billing/cancel");
        }}>Cancelar assinatura</Button>;
  }
  if (target === "free") {
    return <Button variant="secondary" className="mt-5 w-full" disabled={!paid || cancelAtPeriodEnd} loading={loading} onClick={async () => {
      if (await confirm({ title: "Voltar ao plano Free?", description: "A assinatura atual será cancelada ao fim do período.", confirmLabel: "Confirmar", danger: true })) call("/api/billing/cancel");
    }}>{cancelAtPeriodEnd ? "Downgrade agendado" : "Mudar para Free"}</Button>;
  }
  const up = ORDER[target] > ORDER[current];
  return <Button variant={up ? "primary" : "secondary"} className="mt-5 w-full" loading={loading} onClick={() => call("/api/billing/checkout", { plan: target })}>{up ? `Fazer upgrade` : "Mudar de plano"}</Button>;
}
