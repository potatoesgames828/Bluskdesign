"use client";
import Link from "next/link";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge, priorityTone } from "@/components/ui/Misc";
import { PRIORITIES, priorityLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/ui/Feedback";
import { date, errorMessage, toISODate } from "@/lib/utils";

export default function TasksPage() {
  const { toast } = useFeedback();
  const today = toISODate(new Date());
  return (
    <>
      <PageHeader title="Tarefas" description="Todas as tarefas, vinculadas a projetos ou avulsas." />
      <CrudTable entity="task" select="*, projects(name)" searchColumns={["title", "assignee", "description"]}
        defaultSort={{ column: "due_date", ascending: true }}
        filters={[
          { name: "done", label: "Situação", options: [{ value: "false", label: "Pendentes" }, { value: "true", label: "Concluídas" }] },
          { name: "priority", label: "Prioridade", options: PRIORITIES.map((s) => ({ value: s.id, label: s.label })) },
        ]}
        newLabel="Nova tarefa" emptyIcon={ListChecks} emptyTitle="Nenhuma tarefa"
        emptyDescription="Crie tarefas para organizar a execução dos seus projetos."
        columns={[
          { key: "title", label: "Tarefa", sortable: true, render: (r) => (
            <div className="flex items-center gap-2.5">
              <ToggleDone row={r} onError={(m) => toast(m, "error")} />
              <div><p className={r.done ? "text-muted line-through" : "font-medium"}>{r.title}</p>{r.description && <p className="line-clamp-1 text-xs text-muted">{r.description}</p>}</div>
            </div>) },
          { key: "project_id", label: "Projeto", render: (r) => r.projects ? <Link onClick={(e) => e.stopPropagation()} href={`/app/projetos/${r.project_id}`} className="text-brand-light hover:underline">{r.projects.name}</Link> : <span className="text-muted">Avulsa</span> },
          { key: "assignee", label: "Responsável", render: (r) => r.assignee ?? "—" },
          { key: "priority", label: "Prioridade", sortable: true, render: (r) => <Badge tone={priorityTone(r.priority)}>{priorityLabel(r.priority)}</Badge> },
          { key: "due_date", label: "Prazo", sortable: true, render: (r) => r.due_date ? <span className={!r.done && r.due_date < today ? "text-danger" : ""}>{date(r.due_date)}</span> : "—" },
        ]} />
    </>
  );
}

function ToggleDone({ row, onError }: { row: Record<string, unknown>; onError: (m: string) => void }) {
  const done = Boolean(row.done);
  return (
    <button onClick={async (e) => {
      e.stopPropagation();
      const { error } = await createClient().from("project_tasks").update({ done: !done }).eq("id", row.id as string);
      if (error) onError(errorMessage(error)); else window.dispatchEvent(new Event("blusk:reload"));
    }} aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"} className="shrink-0">
      {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted hover:text-brand-light" />}
    </button>
  );
}
