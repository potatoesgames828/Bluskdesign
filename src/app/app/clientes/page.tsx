"use client";
import { Users } from "lucide-react";
import { CrudTable } from "@/components/app/CrudTable";
import { PageHeader, Badge } from "@/components/ui/Misc";
import { date } from "@/lib/utils";

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clientes" description="Cadastre e acompanhe seus clientes, projetos e pagamentos." />
      <CrudTable entity="client" searchColumns={["name", "company", "email", "phone", "category"]}
        filters={[{ name: "status", label: "Status", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] }]}
        rowHref={(r) => `/app/clientes/${r.id}`}
        newLabel="Novo cliente" emptyIcon={Users} emptyTitle="Nenhum cliente cadastrado"
        emptyDescription="Cadastre seu primeiro cliente para vincular projetos, contratos e pagamentos."
        columns={[
          { key: "name", label: "Nome", sortable: true, render: (r) => <div><p className="font-medium">{r.name}</p>{r.company && <p className="text-xs text-muted">{r.company}</p>}</div> },
          { key: "email", label: "E-mail", render: (r) => r.email ?? "—" },
          { key: "phone", label: "Telefone", render: (r) => r.whatsapp ?? r.phone ?? "—" },
          { key: "category", label: "Categoria", sortable: true, render: (r) => r.category ?? "—" },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "active" ? "green" : "neutral"}>{r.status === "active" ? "Ativo" : "Inativo"}</Badge> },
          { key: "created_at", label: "Cadastro", sortable: true, render: (r) => date(r.created_at) },
        ]} />
    </>
  );
}
