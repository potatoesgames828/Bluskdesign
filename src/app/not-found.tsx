import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-7xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-muted">O endereço pode ter mudado ou não existe.</p>
        <div className="mt-6 flex justify-center gap-2"><Link href="/" className={buttonClass("secondary")}>Início</Link><Link href="/app" className={buttonClass("primary")}>Ir para o painel</Link></div>
      </div>
    </div>
  );
}
