"use client";
import { useRouter } from "next/navigation";
import { Contact, MessageCircle, Send } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge, priorityTone } from "@/components/ui/Misc";
import { LEAD_STATUSES, PRIORITIES, priorityLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/ui/Feedback";
import { date, errorMessage, whatsappLink } from "@/lib/utils";

export default function ContactsPage() {
  const { toast } = useFeedback();
  const router = useRouter();
  async function sendToCrm(r: Record<string, string | null>, reload: () => void) {
    const supabase = createClient();
    const { data, error } = await supabase.from("opportunities").insert({
      title: `Oportunidade — ${r.company_name}`, company: r.company_name, contact_name: r.contact_name,
      segment: r.segment, lead_id: r.id, priority: r.priority ?? "medium", stage: "new",
    }).select("id").single();
    if (error) return toast(errorMessage(error), "error");
    await supabase.from("leads").update({ status: "qualified" }).eq("id", r.id!);
    toast("Lead enviado para o CRM.");
    reload();
    router.push(`/app/crm/${data.id}`);
  }
  return (
    <>
      <PageHeader title="Contatos" description="Leads e potenciais clientes — cadastrados manualmente ou pelo Blusk Hunter." />
      <CrudTable entity="lead" searchColumns={["company_name", "contact_name", "email", "phone", "city", "segment"]}
        filters={[
          { name: "status", label: "Status", options: LEAD_STATUSES.map((s) => ({ value: s.id, label: s.label })) },
          { name: "priority", label: "Prioridade", options: PRIORITIES.map((s) => ({ value: s.id, label: s.label })) },
        ]}
        newLabel="Novo lead" emptyIcon={Contact} emptyTitle="Nenhum lead ainda"
        emptyDescription="Cadastre leads manualmente ou encontre empresas com o Blusk Hunter."
        rowActions={(r, reload) => (
          <>
            {whatsappLink(r.whatsapp ?? r.phone) && (
              <a href={whatsappLink(r.whatsapp ?? r.phone)!} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-muted hover:bg-success/10 hover:text-success" title="Abrir WhatsApp" aria-label="Abrir WhatsApp"><MessageCircle className="h-4 w-4" /></a>
            )}
            <button onClick={() => sendToCrm(r, reload)} className="rounded-lg p-2 text-muted hover:bg-brand/10 hover:text-brand-light" title="Enviar para o CRM" aria-label="Enviar para o CRM"><Send className="h-4 w-4" /></button>
          </>
        )}
        columns={[
          { key: "company_name", label: "Empresa", sortable: true, render: (r) => <div><p className="font-medium">{r.company_name}</p><p className="text-xs text-muted">{[r.contact_name, r.segment].filter(Boolean).join(" · ") || "—"}</p></div> },
          { key: "city", label: "Local", render: (r) => [r.city, r.state].filter(Boolean).join("/") || "—" },
          { key: "phone", label: "Telefone", render: (r) => r.whatsapp ?? r.phone ?? "—" },
          { key: "score", label: "Score", sortable: true, render: (r) => r.score != null ? <Badge tone={r.score >= 70 ? "green" : r.score >= 45 ? "yellow" : "neutral"}>{r.score}</Badge> : "—" },
          { key: "priority", label: "Prioridade", sortable: true, render: (r) => <Badge tone={priorityTone(r.priority)}>{priorityLabel(r.priority)}</Badge> },
          { key: "status", label: "Status", render: (r) => <Badge tone="blue">{LEAD_STATUSES.find((s) => s.id === r.status)?.label}</Badge> },
          { key: "last_contact_at", label: "Último contato", sortable: true, render: (r) => date(r.last_contact_at) },
        ]} />
    </>
  );
}
