"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings, CreditCard, X, User } from "lucide-react";
import { Sidebar, SidebarContent } from "./Sidebar";
import { useApp } from "./AppContext";
import { Avatar } from "@/components/ui/Misc";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { EntityFormModal } from "./EntityForm";
import type { EntityKey } from "@/lib/entities";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const QUICK: { key: EntityKey; label: string }[] = [
  { key: "lead", label: "Novo lead" },
  { key: "client", label: "Novo cliente" },
  { key: "project", label: "Novo projeto" },
  { key: "income", label: "Nova receita" },
  { key: "expense", label: "Nova despesa" },
  { key: "task", label: "Nova tarefa" },
];

export function useQuickAction() {
  const [entity, setEntity] = useState<EntityKey | null>(null);
  return { entity, open: setEntity, close: () => setEntity(null) };
}

export function AppShell({ children, unread }: { children: ReactNode; unread: number }) {
  const { profile } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [entity, setEntity] = useState<EntityKey | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("blusk:sidebar") === "1"); } catch {}
  }, []);
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); setQuickOpen(false); }, [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("blusk:sidebar", c ? "0" : "1"); } catch {} return !c; });

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggle} unread={unread} />

      {/* Drawer mobile */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/60 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileOpen(false)} />
        <aside className={cn("absolute inset-y-0 left-0 flex w-[84%] max-w-[300px] flex-col border-r border-line bg-surface transition-transform duration-200", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-16 items-center justify-between px-5">
            <Logo href="/app" />
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted hover:bg-elevated" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
          </div>
          <SidebarContent unread={unread} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted hover:bg-elevated lg:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <form className="relative hidden max-w-md flex-1 sm:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/app/busca?q=${encodeURIComponent(q.trim())}`); }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clientes, leads, projetos…"
              className="input h-10 rounded-xl pl-9 pr-14" />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[10px] text-muted md:block">Ctrl K</kbd>
          </form>
          <div className="flex-1 sm:hidden" />
          <Link href="/app/busca" className="rounded-lg p-2 text-muted hover:bg-elevated sm:hidden" aria-label="Buscar"><Search className="h-5 w-5" /></Link>

          <div className="relative" ref={quickRef}>
            <Button size="sm" onClick={() => setQuickOpen((o) => !o)} className="h-9"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Criar</span></Button>
            {quickOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-2xl animate-fade-up">
                {QUICK.map((a) => (
                  <button key={a.key} onClick={() => { setEntity(a.key); setQuickOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated">{a.label}</button>
                ))}
              </div>
            )}
          </div>

          <Link href="/app/notificacoes" className="relative rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" aria-label="Notificações">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-elevated" aria-label="Menu do perfil">
              <Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size={32} />
              <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-2xl animate-fade-up">
                <div className="border-b border-line px-3 pb-2.5 pt-1.5">
                  <p className="truncate text-sm font-medium">{profile.full_name || "Usuário"}</p>
                  <p className="truncate text-xs text-muted">{profile.email}</p>
                </div>
                <Link href="/app/configuracoes" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-elevated"><User className="h-4 w-4 text-muted" />Meu perfil</Link>
                <Link href="/app/assinatura" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-elevated"><CreditCard className="h-4 w-4 text-muted" />Assinatura</Link>
                <Link href="/app/configuracoes?tab=preferencias" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-elevated"><Settings className="h-4 w-4 text-muted" />Configurações</Link>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" />Sair</button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-up">{children}</div>
        </main>
      </div>

      {entity && (
        <EntityFormModal entity={entity} open={!!entity} onClose={() => setEntity(null)} onSaved={() => router.refresh()} />
      )}
    </div>
  );
}
