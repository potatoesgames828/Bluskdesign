"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, FolderKanban, MessageSquare, Pencil, Plus, Trash2, Wallet, TrendingUp, Clock, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROJECT_STATUSES, priorityLabel } from "@/lib/constants";
import type { ActivityLog, Project, Task, Transaction } from "@/lib/types";
import { Card, CardHeader, Badge, ColorBadge, Progress, Skeleton, EmptyState, StatCard, priorityTone } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Field";
import { EntityFormModal } from "@/components/app/EntityForm";
import { useFeedback } from "@/components/ui/Feedback";
import { projectAlerts } from "@/lib/projects";
import { date, dateTime, errorMessage, money, toISODate, cn } from "@/lib/utils";

type P = Project & { clients: { id: string; name: string; email: string | null; phone: string | null } | null };
interface Comment { id: string; task_id: string; content: string; created_at: string }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast, confirm } = useFeedback();
  const [project, setProject] = useState<P | null | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{ open: boolean; initial: Record<string, unknown> | null }>({ open: false, initial: null });

  const load = useCallback(async () => {
    const [p, t, x, l] = await Promise.all([
      supabase.from("projects").select("*, clients(id,name,email,phone)").eq("id", id).maybeSingle(),
      supabase.from("project_tasks").select("*").eq("project_id", id).order("done").order("due_date", { nullsFirst: false }),
      supabase.from("transactions").select("*").eq("project_id", id).neq("status", "canceled"),
      supabase.from("activity_logs").select("*").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    setProject(p.data as P | null);
    const ts = (t.data as Task[]) ?? [];
    setTasks(ts);
    setTxs((x.data as Transaction[]) ?? []);
    setLogs((l.data as ActivityLog[]) ?? []);
    if (ts.length) {
      const { data } = await supabase.from("task_comments").select("*").in("task_id", ts.map((k) => k.id)).order("created_at");
      setComments((data as Comment[]) ?? []);
    }
  }, [id, supabase]);
  useEffect(() => { load(); }, [load]);

  async function toggle(t: Task) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    const { error } = await supabase.from("project_tasks").update({ done: !t.done }).eq("id", t.id);
    if (error) { toast(errorMessage(error), "error"); load(); }
    else router.refresh();
  }
  async function addQuick() {
    if (!quickTask.trim()) return;
    const { error } = await supabase.from("project_tasks").insert({ project_id: id, title: quickTask.trim() });
    if (error) return toast(errorMessage(error), "error");
    setQuickTask(""); load();
  }
  async function delTask(t: Task) {
    if (!(await confirm({ title: "Excluir tarefa?", description: t.title, danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("project_tasks").delete().eq("id", t.id);
    if (error) return toast(errorMessage(error), "error");
    load();
  }
  async function addComment(taskId: string) {
    if (!comment.trim()) return;
    const { error } = await supabase.from("task_comments").insert({ task_id: taskId, content: comment.trim() });
    if (error) return toast(errorMessage(error), "error");
    setComment(""); load();
  }
  async function setStatus(status: string) {
    const { error } = await supabase.from("projects").update({ status }).eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast("Status atualizado."); load(); router.refresh();
  }
  async function remove() {
    if (!(await confirm({ title: "Excluir projeto?", description: "As tarefas do projeto também serão excluídas. Lançamentos financeiros serão mantidos sem vínculo.", danger: true, confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    toast("Projeto excluído."); router.push("/app/projetos"); router.refresh();
  }

  if (project === undefined) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (project === null) return <Card><EmptyState icon={FolderKanban} title="Projeto não encontrado" action={<Link href="/app/projetos" className="text-brand-light">Voltar</Link>} /></Card>;

  const done = tasks.filter((t) => t.done).length;
  const progress = project.status === "done" ? 100 : tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const realCost = txs.filter((t) => t.type === "expense" && t.status === "paid").reduce((a, t) => a + Number(t.amount), 0);
  const received = txs.filter((t) => t.type === "income" && t.status === "paid").reduce((a, t) => a + Number(t.amount), 0);
  const cost = Math.max(Number(project.estimated_cost), realCost);
  const profit = Number(project.contract_value) - cost;
  const alerts = projectAlerts(project, tasks.length - done);
  const today = toISODate(new Date());
  const st = PROJECT_STATUSES.find((s) => s.id === project.status)!;

  return (
    <>
      <Link href="/app/projetos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />Projetos</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2"><ColorBadge color={st.color}>{st.label}</ColorBadge>{project.category && <Badge>{project.category}</Badge>}</div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm text-muted">{project.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={project.status} onChange={(e) => setStatus(e.target.value)} className="w-56" aria-label="Status">{PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
          <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Editar</Button>
          <Button variant="danger" onClick={remove} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">{alerts.map((a) => (
          <span key={a.text} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs", a.tone === "red" ? "border-danger/30 bg-danger/10 text-danger" : a.tone === "yellow" ? "border-warning/30 bg-warning/10 text-warning" : "border-line bg-elevated text-muted")}><AlertTriangle className="h-3.5 w-3.5" />{a.text}</span>
        ))}</div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valor contratado" value={money(project.contract_value)} icon={Wallet} />
        <StatCard label="Custos" value={money(cost)} icon={Wallet} tone="red" hint={`Estimado ${money(project.estimated_cost)} · pago ${money(realCost)}`} />
        <StatCard label="Lucro estimado" value={money(profit)} icon={TrendingUp} tone={profit >= 0 ? "green" : "red"} hint={`Recebido até agora: ${money(received)}`} />
        <StatCard label="Prazo" value={date(project.due_date)} icon={Clock} tone="yellow" hint={`Início ${date(project.start_date)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Tarefas" subtitle={`${done} de ${tasks.length} concluídas · ${progress}%`}
            action={<Button size="sm" onClick={() => setTaskForm({ open: true, initial: { project_id: id } })}><Plus className="h-3.5 w-3.5" />Detalhada</Button>} />
          <div className="px-5 pt-3"><Progress value={progress} /></div>
          <form className="flex gap-2 px-5 pt-4" onSubmit={(e) => { e.preventDefault(); addQuick(); }}>
            <Input value={quickTask} onChange={(e) => setQuickTask(e.target.value)} placeholder="Adicionar tarefa rápida e pressionar Enter…" />
            <Button type="submit" variant="secondary" aria-label="Adicionar"><Plus className="h-4 w-4" /></Button>
          </form>
          <ul className="p-3">
            {tasks.length === 0 && <li className="py-8 text-center text-sm text-muted">Nenhuma tarefa. O progresso é calculado pelas tarefas concluídas.</li>}
            {tasks.map((t) => {
              const tc = comments.filter((c) => c.task_id === t.id);
              return (
                <li key={t.id} className="rounded-xl hover:bg-elevated/50">
                  <div className="flex items-start gap-3 px-2 py-2.5">
                    <button onClick={() => toggle(t)} className="mt-0.5" aria-label={t.done ? "Reabrir" : "Concluir"}>{t.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted hover:text-brand-light" />}</button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", t.done ? "text-muted line-through" : "font-medium")}>{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={priorityTone(t.priority)}>{priorityLabel(t.priority)}</Badge>
                        {t.assignee && <span>{t.assignee}</span>}
                        {t.due_date && <span className={!t.done && t.due_date < today ? "text-danger" : ""}>Prazo {date(t.due_date)}</span>}
                        <button onClick={() => setOpenTask(openTask === t.id ? null : t.id)} className="inline-flex items-center gap-1 hover:text-fg"><MessageSquare className="h-3 w-3" />{tc.length}</button>
                      </div>
                      {t.description && <p className="mt-1 text-xs text-muted">{t.description}</p>}
                    </div>
                    <button onClick={() => setTaskForm({ open: true, initial: { ...t } })} className="p-1 text-muted hover:text-fg" aria-label="Editar tarefa"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => delTask(t)} className="p-1 text-muted hover:text-danger" aria-label="Excluir tarefa"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {openTask === t.id && (
                    <div className="mb-2 ml-10 mr-2 space-y-2 border-l border-line pl-3">
                      {tc.map((c) => <div key={c.id} className="text-xs"><p className="whitespace-pre-wrap">{c.content}</p><p className="text-muted">{dateTime(c.created_at)}</p></div>)}
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addComment(t.id); }}>
                        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentar…" className="h-8 py-1 text-xs" />
                        <Button size="sm" type="submit">Enviar</Button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Cliente</h3>
            {project.clients ? (
              <Link href={`/app/clientes/${project.clients.id}`} className="block rounded-xl border border-line p-3 hover:border-brand/40">
                <p className="font-medium">{project.clients.name}</p>
                <p className="text-xs text-muted">{project.clients.email ?? ""} {project.clients.phone ?? ""}</p>
              </Link>
            ) : <p className="text-sm text-muted">Nenhum cliente vinculado.</p>}
            <p className="mt-4 text-xs text-muted">Responsável</p><p className="text-sm">{project.owner ?? "—"}</p>
          </Card>
          <Card>
            <CardHeader title="Histórico" />
            <ul className="space-y-3 p-5">
              {logs.length === 0 && <li className="text-sm text-muted">Sem registros.</li>}
              {logs.map((l) => <li key={l.id} className="flex gap-2.5 text-sm"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><div><p>{l.summary}</p><p className="text-xs text-muted">{dateTime(l.created_at)}</p></div></li>)}
            </ul>
          </Card>
        </div>
      </div>

      <EntityFormModal entity="project" open={editOpen} onClose={() => setEditOpen(false)} initial={project as unknown as Record<string, unknown>} onSaved={load} />
      <EntityFormModal entity="task" open={taskForm.open} onClose={() => setTaskForm({ open: false, initial: null })} initial={taskForm.initial} onSaved={load} />
    </>
  );
}
