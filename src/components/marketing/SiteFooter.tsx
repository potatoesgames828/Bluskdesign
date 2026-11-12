import Link from "next/link";
import { Instagram, Linkedin, Youtube, Mail } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter() {
  const cols: [string, [string, string][]][] = [
    ["Plataforma", [["/#ecossistema", "Módulos"], ["/#recursos", "Recursos"], ["/#planos", "Planos"], ["/#demonstracao", "Demonstração"]]],
    ["Empresa", [["/#como-funciona", "Como funciona"], ["/#faq", "Perguntas frequentes"], ["mailto:contato@bluskdesign.com", "Contato"]]],
    ["Legal", [["/termos", "Termos de uso"], ["/privacidade", "Política de privacidade"]]],
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">Criar, prospectar, organizar e vender — em uma única plataforma.</p>
          <div className="mt-5 flex gap-2">
            {[{ i: Instagram, l: "Instagram", h: "https://instagram.com" }, { i: Linkedin, l: "LinkedIn", h: "https://linkedin.com" }, { i: Youtube, l: "YouTube", h: "https://youtube.com" }, { i: Mail, l: "E-mail", h: "mailto:contato@bluskdesign.com" }].map(({ i: I, l, h }) => (
              <a key={l} href={h} target="_blank" rel="noopener noreferrer" aria-label={l} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:border-brand/50 hover:text-fg"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        {cols.map(([t, links]) => (
          <div key={t}>
            <p className="text-sm font-semibold">{t}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">{links.map(([h, l]) => <li key={l}><Link href={h} className="hover:text-fg">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-muted">© {new Date().getFullYear()} Blusk Design. Todos os direitos reservados.</div>
    </footer>
  );
}
