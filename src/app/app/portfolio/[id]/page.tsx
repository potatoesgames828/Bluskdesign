import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/Misc";
import { buttonClass } from "@/components/ui/Button";
import type { PortfolioItem } from "@/lib/types";

export default async function PortfolioDetail({ params }: { params: { id: string } }) {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("portfolio_items").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const i = data as PortfolioItem;
  return (
    <article className="mx-auto max-w-5xl">
      <Link href="/app/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />Portfólio</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex gap-2"><Badge tone={i.published ? "green" : "neutral"}>{i.published ? "Publicado" : "Rascunho"}</Badge>{i.category && <Badge tone="blue">{i.category}</Badge>}</div>
          <h1 className="text-3xl font-bold">{i.title}</h1>
          <p className="mt-1 text-sm text-muted">{[i.client_name, i.completed_at && new Date(i.completed_at + "T12:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}</p>
        </div>
        {i.demo_url && <a href={i.demo_url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>Ver demonstração <ExternalLink className="h-4 w-4" /></a>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {i.cover_url && <img src={i.cover_url} alt={i.title} className="mb-8 w-full rounded-2xl border border-line object-cover" />}
      {i.description && <p className="mb-8 max-w-3xl whitespace-pre-wrap leading-relaxed text-muted">{i.description}</p>}
      {i.gallery?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {i.gallery.map((g) => <img key={g} src={g} alt="" className="w-full rounded-xl border border-line object-cover" />)}
        </div>
      )}
    </article>
  );
}
