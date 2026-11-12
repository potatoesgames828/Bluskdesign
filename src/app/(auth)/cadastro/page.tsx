"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EMAIL_RE, validatePassword } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const rules = [{ ok: v.password.length >= 8, label: "8+ caracteres" }, { ok: /[A-Za-z]/.test(v.password) && /\d/.test(v.password), label: "Letras e números" }];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 3) errs.name = "Informe seu nome completo.";
    if (!EMAIL_RE.test(v.email.trim())) errs.email = "E-mail inválido.";
    const pe = validatePassword(v.password); if (pe) errs.password = pe;
    if (v.password !== v.confirm) errs.confirm = "As senhas não coincidem.";
    setErrors(errs); setError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await createClient().auth.signUp({
      email: v.email.trim().toLowerCase(), password: v.password,
      options: { data: { full_name: v.name.trim() }, emailRedirectTo: `${site}/auth/callback?next=/app` },
    });
    setLoading(false);
    if (error) return setError(/registered|exists/i.test(error.message) ? "Este e-mail já está cadastrado." : error.message);
    // Supabase retorna identities vazio quando o e-mail já existe (proteção contra enumeração)
    if (data.user && data.user.identities?.length === 0) return setError("Este e-mail já está cadastrado. Faça login ou recupere sua senha.");
    if (data.session) { router.push("/app"); router.refresh(); } else router.push("/login?registered=1");
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">Comece grátis. Sem cartão de crédito.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Nome completo" error={errors.name}><Input autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="E-mail" error={errors.email}><Input type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        <Field label="Senha" error={errors.password}><Input type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></Field>
        <div className="flex gap-3 text-xs">{rules.map((r) => <span key={r.label} className={cn("flex items-center gap-1", r.ok ? "text-success" : "text-muted")}><Check className="h-3 w-3" />{r.label}</span>)}</div>
        <Field label="Confirmar senha" error={errors.confirm}><Input type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} /></Field>
        {error && <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={loading}>Criar conta</Button>
        <p className="text-center text-xs text-muted">Ao criar a conta você concorda com os <Link href="/termos" className="underline">Termos de uso</Link> e a <Link href="/privacidade" className="underline">Política de privacidade</Link>.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Já tem conta? <Link href="/login" className="font-medium text-brand-light hover:underline">Entrar</Link></p>
    </>
  );
}
