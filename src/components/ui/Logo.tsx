import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#3478F6" />
      <path d="M10 8h7.2c3 0 4.9 1.6 4.9 4 0 1.6-.9 2.8-2.3 3.3 1.8.4 3 1.8 3 3.7 0 2.7-2.1 4.5-5.3 4.5H10V8Zm4 6.3h2.6c1 0 1.6-.6 1.6-1.4 0-.9-.6-1.4-1.6-1.4H14v2.8Zm0 6.4h3c1.1 0 1.8-.6 1.8-1.6s-.7-1.6-1.8-1.6h-3v3.2Z" fill="#F5F7FA" />
    </svg>
  );
}

export function Logo({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Blusk Design">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight">
          blusk<span className="text-brand">.</span>design
        </span>
      )}
    </Link>
  );
}
