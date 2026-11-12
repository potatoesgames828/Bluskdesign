import Link from "next/link";
import { Activity, CheckCircle2, Contact, FolderKanban, KanbanSquare, Users, Wallet } from "lucide-react";
import type { ActivityLog } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const ICON: Record<string, typeof Activity> = { client: Users, lead: Contact, opportunity: KanbanSquare, project: FolderKanban, task: CheckCircle2, transaction: Wallet };

export function ActivityList({ items }: { items: ActivityLog[] }) {
  return (
    <ul className="divide-y divide-line/60">
      {items.map((a) => {
        const Icon = ICON[a.entity] ?? Activity;
        const inner = (
          <>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-elevated text-brand-light"><Icon className="h-4 w-4" /></span>
            <p className="min-w-0 flex-1 truncate text-sm">{a.summary}</p>
            <time className="shrink-0 text-xs text-muted">{timeAgo(a.created_at)}</time>
          </>
        );
        return (
          <li key={a.id}>
            {a.link ? <Link href={a.link} className="flex items-center gap-3 px-5 py-3 hover:bg-elevated/40">{inner}</Link> : <div className="flex items-center gap-3 px-5 py-3">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}
