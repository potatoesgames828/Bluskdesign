import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

export function UpgradeGate({ title, description, plan = "Pro" }: { title: string; description: string; plan?: string }) {
  return (
    <div className="card relative overflow-hidden p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-light"><Lock className="h-5 w-5" /></div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <Link href="/app/assinatura" className={buttonClass("primary", "md", "mt-6")}>Fazer upgrade para o {plan}</Link>
      </div>
    </div>
  );
}
