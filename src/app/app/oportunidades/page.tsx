"use client";
import { Target } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge, ColorBadge, priorityTone } from "@/components/ui/Misc";
import { STAGES, PRIORITIES, priorityLabel } from "@/lib/constants";
import { date, money } from "@/lib/utils";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title="Oportunidades" description="Visão em tabela de todas as negociações do pipeline."
        actions={<Link href="/app/crm" className={buttonClass("secondary")}>Ver Kanban</Link>} />
      <CrudTable entity="opportunity" select="*, clients(name)" searchColumns={["title", "company", "contact_name", "owner", "segment"]}
        filters={[
          { name: "stage", label: "Etapa", options: STAGES.map((s) => ({ value: s.id, label: s.label })) },
          { name: "priority", label: "Prioridade", options: PRIORITIES.map((s) => ({ value: s.id, label: s.label })) },
        ]}
        allowDuplicate rowHref={(r) => `/app/crm/${r.id}`}
        newLabel="Nova oportunidade" emptyIcon={Target} emptyTitle="Nenhuma oportunidade"
        emptyDescription="Crie oportunidades para acompanhar suas negociações até o fechamento."
        columns={[
          { key: "title", label: "Oportunidade", sortable: true, render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{[r.company, r.contact_name].filter(Boolean).join(" · ") || "—"}</p></div> },
          { key: "value", label: "Valor", sortable: true, render: (r) => <span className="tabular-nums">{money(r.value)}</span> },
          { key: "stage", label: "Etapa", sortable: true, render: (r) => { const s = STAGES.find((x) => x.id === r.stage)!; return <ColorBadge color={s.color}>{s.label}</ColorBadge>; } },
          { key: "priority", label: "Prioridade", render: (r) => <Badge tone={priorityTone(r.priority)}>{priorityLabel(r.priority)}</Badge> },
          { key: "owner", label: "Responsável", render: (r) => r.owner ?? "—" },
          { key: "last_interaction_at", label: "Última interação", sortable: true, render: (r) => date(r.last_interaction_at) },
        ]} />
    </>
  );
}
