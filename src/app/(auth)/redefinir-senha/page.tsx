"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { validatePassword } from "@/lib/auth-validation";

export default function ResetPage() {
  const router = useRouter();
  const [p, setP] = useState({ a: "", b: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePassword(p.a);
    if (err) return setError(err);
    if (p.a !== p.b) return setError("As senhas não coincidem.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: p.a });
    if (error) { setLoading(false); return setError(error.message.includes("session") ? "Link expirado. Solicite uma nova recuperação." : error.message); }
    await supabase.auth.signOut();
    router.push("/login?reset=1");
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Nova senha</h1>
      <p className="mt-1 text-sm text-muted">Defina uma nova senha para sua conta.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Nova senha" hint="Mínimo 8 caracteres, com letras e números."><Input type="password" autoComplete="new-password" value={p.a} onChange={(e) => setP({ ...p, a: e.target.value })} /></Field>
        <Field label="Confirmar senha" error={error}><Input type="password" autoComplete="new-password" value={p.b} onChange={(e) => setP({ ...p, b: e.target.value })} /></Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Salvar nova senha</Button>
      </form>
    </>
  );
}
