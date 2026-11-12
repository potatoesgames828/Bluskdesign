"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Contact, FolderPlus, ListPlus, TrendingDown, TrendingUp, UserPlus } from "lucide-react";
import { EntityFormModal } from "./EntityForm";
import type { EntityKey } from "@/lib/entities";

const ACTIONS: { key: EntityKey; label: string; icon: typeof Contact }[] = [
  { key: "lead", label: "Novo lead", icon: Contact },
  { key: "client", label: "Novo cliente", icon: UserPlus },
  { key: "project", label: "Novo projeto", icon: FolderPlus },
  { key: "income", label: "Nova receita", icon: TrendingUp },
  { key: "expense", label: "Nova despesa", icon: TrendingDown },
  { key: "task", label: "Nova tarefa", icon: ListPlus },
];

export function QuickActions() {
  const [entity, setEntity] = useState<EntityKey | null>(null);
  const router = useRouter();
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <button key={a.key} onClick={() => setEntity(a.key)} className="flex items-center gap-2.5 rounded-xl border border-line bg-bg/40 px-3 py-3 text-left text-sm transition hover:border-brand/50 hover:bg-brand/5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-light"><a.icon className="h-4 w-4" /></span>
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>
      {entity && <EntityFormModal entity={entity} open onClose={() => setEntity(null)} onSaved={() => router.refresh()} />}
    </>
  );
}
