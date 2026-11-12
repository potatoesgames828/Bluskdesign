"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LINKS = [["#ecossistema", "Plataforma"], ["#como-funciona", "Como funciona"], ["#recursos", "Recursos"], ["#planos", "Planos"], ["#faq", "FAQ"]];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all", scrolled || open ? "border-b border-line bg-bg/85 backdrop-blur-xl" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {LINKS.map(([h, l]) => <a key={h} href={`/${h}`} className="transition hover:text-fg">{l}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClass("ghost", "sm")}>Entrar</Link>
          <Link href="/cadastro" className={buttonClass("primary", "sm")}>Começar agora</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 md:hidden" aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="border-t border-line px-5 pb-5 md:hidden">
          <nav className="flex flex-col py-2">{LINKS.map(([h, l]) => <a key={h} href={`/${h}`} onClick={() => setOpen(false)} className="py-2.5 text-muted">{l}</a>)}</nav>
          <div className="grid grid-cols-2 gap-2"><Link href="/login" className={buttonClass("secondary")}>Entrar</Link><Link href="/cadastro" className={buttonClass("primary")}>Começar</Link></div>
        </div>
      )}
    </header>
  );
}
