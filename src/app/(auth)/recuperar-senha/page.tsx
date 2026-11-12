"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EMAIL_RE } from "@/lib/auth-validation";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Informe um e-mail válido.");
    setLoading(true); setError(null);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${site}/auth/callback?next=/redefinir-senha` });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }
  if (sent) return (
    <div className="text-center">
      <MailCheck className="mx-auto h-10 w-10 text-brand-light" />
      <h1 className="mt-4 text-2xl font-bold">Verifique seu e-mail</h1>
      <p className="mt-2 text-sm text-muted">Se existir uma conta para <strong>{email}</strong>, você receberá um link para redefinir a senha.</p>
      <Link href="/login" className="mt-6 inline-block text-sm text-brand-light">Voltar ao login</Link>
    </div>
  );
  return (
    <>
      <h1 className="text-2xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted">Enviaremos um link de redefinição para seu e-mail.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="E-mail" error={error}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Enviar link</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand-light">Voltar ao login</Link></p>
    </>
  );
}
