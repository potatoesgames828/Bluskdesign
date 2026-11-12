"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EMAIL_RE } from "@/lib/auth-validation";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(sp.get("config") === "missing" ? "O Supabase ainda não está configurado neste ambiente (veja o README)." : sp.get("error") ? "Link inválido ou expirado." : null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email)) return setError("Informe um e-mail válido.");
    if (!password) return setError("Informe sua senha.");
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setLoading(false);
      return setError(error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : error.message.includes("Email not confirmed") ? "Confirme seu e-mail antes de entrar." : error.message);
    }
    const next = sp.get("next");
    router.push(next && next.startsWith("/app") ? next : "/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Bem-vindo de volta à Blusk Design.</p>
      {sp.get("registered") && <p className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">Conta criada! Verifique seu e-mail para confirmar o cadastro.</p>}
      {sp.get("reset") && <p className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">Senha redefinida. Entre com a nova senha.</p>}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="E-mail"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" /></Field>
        <Field label="Senha"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="flex justify-end"><Link href="/recuperar-senha" className="text-xs text-brand-light hover:underline">Esqueci minha senha</Link></div>
        {error && <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={loading}>Entrar</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Ainda não tem conta? <Link href="/cadastro" className="font-medium text-brand-light hover:underline">Criar conta grátis</Link></p>
    </>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
