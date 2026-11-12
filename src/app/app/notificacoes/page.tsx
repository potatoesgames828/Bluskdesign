"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { cn, errorMessage, timeAgo } from "@/lib/utils";

const CATS = [["", "Todas"], ["sales", "Vendas"], ["projects", "Projetos"], ["finance", "Financeiro"], ["account", "Conta"]];

export default function NotificationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useFeedback();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [cat, setCat] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
    if (cat) q = q.eq("category", cat);
    if (unreadOnly) q = q.is("read_at", null);
    const { data } = await q;
    setItems((data as Notification[]) ?? []);
  }, [supabase, cat, unreadOnly]);
  useEffect(() => { load(); }, [load]);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) return toast(errorMessage(error), "error");
    load(); router.refresh();
  }
  async function markAll() {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) return toast(errorMessage(error), "error");
    toast("Todas marcadas como lidas."); load(); router.refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    load(); router.refresh();
  }
  async function open(n: Notification) {
    if (!n.read_at) await markRead([n.id]);
    if (n.link) router.push(n.link);
  }

  return (
    <>
      <PageHeader title="Notificações" description="Leads, negociações, prazos, pagamentos e assinatura."
        actions={<Button variant="secondary" onClick={markAll}><CheckCheck className="h-4 w-4" />Marcar todas como lidas</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {CATS.map(([k, l]) => <button key={k} onClick={() => setCat(k)} className={cn("rounded-lg px-3 py-1.5 text-sm", cat === k ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-elevated")}>{l}</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted"><input type="checkbox" className="accent-[#3478F6]" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Somente não lidas</label>
      </div>
      <Card>
        {items === null ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : items.length === 0 ? <EmptyState icon={Bell} title="Nenhuma notificação" description="Você está em dia." />
          : <ul className="divide-y divide-line/60">
            {items.map((n) => (
              <li key={n.id} className={cn("group flex items-start gap-3 px-5 py-3.5", !n.read_at && "bg-brand/[.04]")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-line" : "bg-brand")} />
                <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="truncate text-sm text-muted">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </button>
                {!n.read_at && <button onClick={() => markRead([n.id])} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" aria-label="Marcar como lida" title="Marcar como lida"><Check className="h-4 w-4" /></button>}
                <button onClick={() => remove(n.id)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>}
      </Card>
    </>
  );
}
