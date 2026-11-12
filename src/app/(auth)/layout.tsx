import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10"><div className="w-full max-w-sm animate-fade-up">{children}</div></div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Blusk Design</p>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line bg-surface lg:block">
        <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-brand/25 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="font-display text-3xl font-bold leading-tight">Criar, prospectar,<br />organizar e <span className="text-brand-light">vender</span>.</p>
          <p className="mt-3 max-w-md text-muted">IA, prospecção, CRM, projetos e finanças em um único ecossistema — com dados reais e seguros.</p>
        </div>
      </div>
    </div>
  );
}
