"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, PanelLeftClose, PanelLeftOpen, Shield } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";
import { useApp } from "./AppContext";

export function isActive(pathname: string, href: string) {
  if (href === "/app" || href === "/app/financeiro") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarContent({ collapsed, onNavigate, unread }: { collapsed?: boolean; onNavigate?: () => void; unread: number }) {
  const pathname = usePathname();
  const { plan, profile } = useApp();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Navegação principal">
      {NAV.map((group) => (
        <div key={group.section}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">{group.section}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const locked = item.feature && !plan.features?.[item.feature];
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}
                    className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition-colors",
                      active ? "bg-brand/10 text-fg" : "text-muted hover:bg-elevated hover:text-fg", collapsed && "justify-center px-0")}>
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand" />}
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-light" : "")} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && locked && <Lock className="h-3.5 w-3.5 text-muted/60" />}
                    {!collapsed && item.href === "/app/notificacoes" && unread > 0 && (
                      <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {profile.role === "admin" && (
        <div>
          {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">Plataforma</p>}
          <Link href="/app/admin" onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px]", isActive(pathname, "/app/admin") ? "bg-brand/10 text-fg" : "text-muted hover:bg-elevated hover:text-fg", collapsed && "justify-center px-0")}>
            <Shield className="h-[18px] w-[18px]" />{!collapsed && "Administração"}
          </Link>
        </div>
      )}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle, unread }: { collapsed: boolean; onToggle: () => void; unread: number }) {
  const { plan } = useApp();
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur transition-[width] duration-200 lg:flex", collapsed ? "w-[76px]" : "w-[264px]")}>
      <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
        <Logo href="/app" compact={collapsed} />
      </div>
      <SidebarContent collapsed={collapsed} unread={unread} />
      <div className="border-t border-line p-3">
        {!collapsed && (
          <Link href="/app/assinatura" className="mb-2 block rounded-xl border border-line bg-elevated/50 p-3 text-xs hover:border-brand/40">
            <span className="text-muted">Plano atual</span>
            <span className="mt-0.5 block font-semibold text-fg">{plan.name}{plan.id !== "elite" && <span className="ml-1 text-brand-light">· fazer upgrade</span>}</span>
          </Link>
        )}
        <button onClick={onToggle} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted hover:bg-elevated hover:text-fg", collapsed && "justify-center px-0")} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Recolher</>}
        </button>
      </div>
    </aside>
  );
}
