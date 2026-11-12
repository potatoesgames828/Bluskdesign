"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, KeyRound, LogOut, Palette, ShieldCheck, User, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app/AppContext";
import { PageHeader, Card, Avatar } from "@/components/ui/Misc";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useFeedback } from "@/components/ui/Feedback";
import type { Preferences } from "@/lib/types";
import { cn, date, errorMessage } from "@/lib/utils";
import { validatePassword } from "@/lib/auth-validation";

const TABS = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck },
  { id: "preferencias", label: "Preferências", icon: Palette },
  { id: "assinatura", label: "Assinatura", icon: CreditCard },
];

export default function SettingsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = TABS.some((t) => t.id === sp.get("tab")) ? sp.get("tab")! : "perfil";
  return (
    <>
      <PageHeader title="Configurações" description="Perfil, segurança, preferências e assinatura." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => router.replace(`/app/configuracoes?tab=${t.id}`)} className={cn("flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm", tab === t.id ? "bg-brand/10 text-fg" : "text-muted hover:bg-elevated hover:text-fg")}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </nav>
        <div>{tab === "perfil" ? <ProfileTab /> : tab === "seguranca" ? <SecurityTab /> : tab === "preferencias" ? <PrefsTab /> : <PlanTab />}</div>
      </div>
    </>
  );
}

function ProfileTab() {
  const { profile } = useApp();
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState({ full_name: profile.full_name, phone: profile.phone ?? "", company: profile.company ?? "" });
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function save() {
    if (v.full_name.trim().length < 2) return toast("Informe seu nome.", "error");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: v.full_name.trim(), phone: v.phone || null, company: v.company || null }).eq("id", profile.id);
    if (!error && email.trim().toLowerCase() !== profile.email) {
      const { error: e2 } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
      if (e2) toast(errorMessage(e2), "error"); else toast("Enviamos um link de confirmação para o novo e-mail.", "info");
    }
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    toast("Perfil atualizado."); router.refresh();
  }
  async function upload(file: File) {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return toast("Envie uma imagem de até 2 MB.", "error");
    setUploading(true);
    const path = `${profile.id}/avatar-${Date.now()}.${file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); return toast(errorMessage(error), "error"); }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    setUploading(false); toast("Foto atualizada."); router.refresh();
  }
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size={72} />
          <button onClick={() => ref.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 rounded-full border border-line bg-surface p-1.5 hover:bg-elevated" aria-label="Alterar foto"><Camera className="h-3.5 w-3.5" /></button>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
        <div><p className="font-semibold">{profile.full_name || "Sem nome"}</p><p className="text-sm text-muted">Membro desde {date(profile.created_at)} · {profile.role === "admin" ? "Administrador" : "Usuário"}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo"><Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></Field>
        <Field label="E-mail" hint="Alterar exige confirmação no novo endereço."><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Telefone"><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
        <Field label="Empresa"><Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} /></Field>
      </div>
      <Button className="mt-6" onClick={save} loading={saving}>Salvar alterações</Button>
    </Card>
  );
}

function SecurityTab() {
  const supabase = createClient();
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  async function changePassword() {
    const err = validatePassword(pw.next);
    if (err) return toast(err, "error");
    if (pw.next !== pw.confirm) return toast("As senhas não coincidem.", "error");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    setPw({ next: "", confirm: "" }); toast("Senha alterada com sucesso.");
  }
  async function signOut(scope: "local" | "others" | "global") {
    if (scope !== "local" && !(await confirm({ title: scope === "global" ? "Encerrar todas as sessões?" : "Encerrar outras sessões?", description: "Os dispositivos precisarão entrar novamente.", confirmLabel: "Encerrar" }))) return;
    const { error } = await supabase.auth.signOut({ scope });
    if (error) return toast(errorMessage(error), "error");
    if (scope === "others") return toast("Outras sessões encerradas.");
    router.push("/login"); router.refresh();
  }
  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" />Alterar senha</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nova senha" hint="Mínimo 8 caracteres, com letras e números."><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Confirmar nova senha"><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        </div>
        <Button className="mt-5" onClick={changePassword} loading={saving}>Atualizar senha</Button>
      </Card>
      <Card className="p-5 sm:p-6">
        <h3 className="mb-1 flex items-center gap-2 font-semibold"><LogOut className="h-4 w-4" />Sessões</h3>
        <p className="mb-4 text-sm text-muted">Encerre o acesso neste ou em outros dispositivos.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => signOut("local")}>Sair deste dispositivo</Button>
          <Button variant="secondary" onClick={() => signOut("others")}>Encerrar outras sessões</Button>
          <Button variant="danger" onClick={() => signOut("global")}>Encerrar todas</Button>
        </div>
      </Card>
    </div>
  );
}

function PrefsTab() {
  const { profile } = useApp();
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useFeedback();
  const [p, setP] = useState<Preferences>({ theme: "dark", locale: "pt-BR", currency: "BRL", notifications: { email: true, in_app: true }, ...profile.preferences });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ preferences: p }).eq("id", profile.id);
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    document.documentElement.dataset.theme = p.theme ?? "dark";
    toast("Preferências salvas."); router.refresh();
  }
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tema"><Select value={p.theme} onChange={(e) => setP({ ...p, theme: e.target.value as Preferences["theme"] })}><option value="dark">Escuro</option><option value="light">Claro</option></Select></Field>
        <Field label="Idioma e formato regional"><Select value={p.locale} onChange={(e) => setP({ ...p, locale: e.target.value as Preferences["locale"] })}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option></Select></Field>
        <Field label="Moeda"><Select value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value as Preferences["currency"] })}><option value="BRL">Real (R$)</option><option value="USD">Dólar (US$)</option><option value="EUR">Euro (€)</option></Select></Field>
      </div>
      <p className="mt-2 text-xs text-muted">O idioma altera a formatação de datas e números; a interface permanece em português.</p>
      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium">Notificações</p>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#3478F6]" checked={p.notifications?.in_app ?? true} onChange={(e) => setP({ ...p, notifications: { ...p.notifications, in_app: e.target.checked } })} />Notificações na plataforma</label>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#3478F6]" checked={p.notifications?.email ?? true} onChange={(e) => setP({ ...p, notifications: { ...p.notifications, email: e.target.checked } })} />Resumo por e-mail (requer provedor de e-mail configurado)</label>
      </div>
      <Button className="mt-6" onClick={save} loading={saving}>Salvar preferências</Button>
    </Card>
  );
}

function PlanTab() {
  const { plan } = useApp();
  return (
    <Card className="p-5 sm:p-6">
      <p className="text-sm text-muted">Plano atual</p>
      <p className="font-display text-2xl font-bold">{plan.name}</p>
      <p className="mt-1 text-sm text-muted">{plan.description}</p>
      <Link href="/app/assinatura" className={buttonClass("primary", "md", "mt-5")}>Gerenciar assinatura</Link>
    </Card>
  );
}
