"use client";
import { ExternalLink, Library, Star } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge } from "@/components/ui/Misc";
import { date } from "@/lib/utils";

const TYPES = [
  { value: "link", label: "Link" }, { value: "template", label: "Template" }, { value: "snippet", label: "Snippet" },
  { value: "reference", label: "Referência" }, { value: "tool", label: "Ferramenta" },
];

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Biblioteca de recursos" description="Centralize links, templates, snippets, referências visuais e ferramentas que você usa nos projetos." />
      <CrudTable entity="resource" searchColumns={["title", "content", "url"]}
        filters={[{ name: "type", label: "Tipo", options: TYPES }]}
        newLabel="Novo recurso" emptyIcon={Library} emptyTitle="Sua biblioteca está vazia"
        emptyDescription="Salve referências e materiais reutilizáveis para acelerar seus projetos." allowDuplicate
        columns={[
          { key: "title", label: "Título", sortable: true, render: (r) => <div className="flex items-center gap-2">{r.favorite && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}<span className="font-medium">{r.title}</span></div> },
          { key: "type", label: "Tipo", render: (r) => <Badge tone="blue">{TYPES.find((t) => t.value === r.type)?.label}</Badge> },
          { key: "url", label: "Link", render: (r) => r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-brand-light hover:underline">Abrir <ExternalLink className="h-3 w-3" /></a> : "—" },
          { key: "content", label: "Anotações", render: (r) => <span className="line-clamp-1 max-w-xs text-muted">{r.content ?? "—"}</span> },
          { key: "created_at", label: "Criado em", sortable: true, render: (r) => date(r.created_at) },
        ]} />
    </>
  );
}
