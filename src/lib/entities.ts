import {
  STAGES, PROJECT_STATUSES, PRIORITIES, LEAD_STATUSES, TX_STATUSES, PAYMENT_METHODS,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, SEGMENTS,
} from "./constants";

export type FieldType = "text" | "email" | "tel" | "url" | "textarea" | "money" | "number" | "date" | "datetime" | "select" | "relation" | "checkbox";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** relation: tabela e coluna de exibição */
  relation?: { table: "clients" | "projects" | "leads"; labelColumn: string };
  placeholder?: string;
  full?: boolean;
  defaultValue?: string | number | boolean | null;
  datalist?: string[];
  hint?: string;
}

export interface EntityDef {
  table: string;
  singular: string;
  plural: string;
  fields: FieldDef[];
  /** valores fixos inseridos (ex: type = income) */
  fixed?: Record<string, unknown>;
}

const opt = (arr: { id: string; label: string }[]) => arr.map((x) => ({ value: x.id, label: x.label }));
const today = () => new Date().toISOString().slice(0, 10);

export const ENTITIES = {
  client: {
    table: "clients", singular: "cliente", plural: "Clientes",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "company", label: "Empresa", type: "text" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "phone", label: "Telefone", type: "tel" },
      { name: "whatsapp", label: "WhatsApp", type: "tel" },
      { name: "category", label: "Categoria", type: "text", datalist: SEGMENTS },
      { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }], defaultValue: "active" },
      { name: "address", label: "Endereço", type: "text", full: true },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
  },
  lead: {
    table: "leads", singular: "lead", plural: "Contatos",
    fields: [
      { name: "company_name", label: "Empresa", type: "text", required: true },
      { name: "contact_name", label: "Nome do contato", type: "text" },
      { name: "phone", label: "Telefone", type: "tel" },
      { name: "whatsapp", label: "WhatsApp", type: "tel" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "segment", label: "Segmento", type: "text", datalist: SEGMENTS },
      { name: "website", label: "Site", type: "url", placeholder: "https://" },
      { name: "instagram", label: "Instagram", type: "text", placeholder: "@perfil" },
      { name: "city", label: "Cidade", type: "text" },
      { name: "state", label: "Estado", type: "text" },
      { name: "priority", label: "Prioridade", type: "select", options: opt(PRIORITIES), defaultValue: "medium" },
      { name: "status", label: "Status", type: "select", options: opt(LEAD_STATUSES), defaultValue: "new" },
      { name: "last_contact_at", label: "Data do último contato", type: "datetime" },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
  },
  opportunity: {
    table: "opportunities", singular: "oportunidade", plural: "Oportunidades",
    fields: [
      { name: "title", label: "Título", type: "text", required: true, full: true, placeholder: "Ex.: Site institucional — Barbearia Silva" },
      { name: "company", label: "Empresa", type: "text" },
      { name: "contact_name", label: "Contato", type: "text" },
      { name: "value", label: "Valor potencial", type: "money", defaultValue: 0 },
      { name: "segment", label: "Segmento", type: "text", datalist: SEGMENTS },
      { name: "stage", label: "Etapa", type: "select", options: opt(STAGES), defaultValue: "new" },
      { name: "priority", label: "Prioridade", type: "select", options: opt(PRIORITIES), defaultValue: "medium" },
      { name: "owner", label: "Responsável", type: "text" },
      { name: "client_id", label: "Cliente associado", type: "relation", relation: { table: "clients", labelColumn: "name" } },
      { name: "reminder_at", label: "Lembrete", type: "datetime" },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
  },
  project: {
    table: "projects", singular: "projeto", plural: "Projetos",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, full: true },
      { name: "client_id", label: "Cliente", type: "relation", relation: { table: "clients", labelColumn: "name" } },
      { name: "category", label: "Categoria", type: "text", datalist: ["Site institucional", "Landing page", "E-commerce", "Aplicação web", "Identidade visual", "Motion", "Marketing"] },
      { name: "contract_value", label: "Valor contratado", type: "money", defaultValue: 0 },
      { name: "estimated_cost", label: "Custo estimado", type: "money", defaultValue: 0 },
      { name: "start_date", label: "Início", type: "date" },
      { name: "due_date", label: "Prazo", type: "date" },
      { name: "owner", label: "Responsável", type: "text" },
      { name: "status", label: "Status", type: "select", options: opt(PROJECT_STATUSES), defaultValue: "planning" },
      { name: "description", label: "Descrição", type: "textarea", full: true },
    ],
  },
  task: {
    table: "project_tasks", singular: "tarefa", plural: "Tarefas",
    fields: [
      { name: "title", label: "Título", type: "text", required: true, full: true },
      { name: "project_id", label: "Projeto", type: "relation", relation: { table: "projects", labelColumn: "name" } },
      { name: "assignee", label: "Responsável", type: "text" },
      { name: "priority", label: "Prioridade", type: "select", options: opt(PRIORITIES), defaultValue: "medium" },
      { name: "due_date", label: "Prazo", type: "date" },
      { name: "done", label: "Concluída", type: "checkbox", defaultValue: false },
      { name: "description", label: "Descrição", type: "textarea", full: true },
    ],
  },
  income: {
    table: "transactions", singular: "receita", plural: "Receitas", fixed: { type: "income" },
    fields: [
      { name: "description", label: "Descrição", type: "text", required: true, full: true },
      { name: "amount", label: "Valor", type: "money", required: true },
      { name: "category", label: "Categoria", type: "select", options: INCOME_CATEGORIES.map((c) => ({ value: c, label: c })), defaultValue: "Projeto" },
      { name: "client_id", label: "Cliente", type: "relation", relation: { table: "clients", labelColumn: "name" } },
      { name: "project_id", label: "Projeto associado", type: "relation", relation: { table: "projects", labelColumn: "name" } },
      { name: "date", label: "Vencimento / competência", type: "date", required: true, defaultValue: "__today" },
      { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: "Pendente (a receber)" }, { value: "paid", label: "Recebido" }, { value: "canceled", label: "Cancelado" }], defaultValue: "pending" },
      { name: "paid_at", label: "Data de recebimento", type: "date", hint: "Preenchida automaticamente ao marcar como recebido." },
      { name: "payment_method", label: "Forma de pagamento", type: "select", options: PAYMENT_METHODS.map((c) => ({ value: c, label: c })) },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
  },
  expense: {
    table: "transactions", singular: "despesa", plural: "Despesas", fixed: { type: "expense" },
    fields: [
      { name: "description", label: "Descrição", type: "text", required: true, full: true },
      { name: "amount", label: "Valor", type: "money", required: true },
      { name: "category", label: "Categoria", type: "select", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })), defaultValue: "Software" },
      { name: "date", label: "Data / vencimento", type: "date", required: true, defaultValue: "__today" },
      { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: "Pendente (a pagar)" }, { value: "paid", label: "Pago" }, { value: "canceled", label: "Cancelado" }], defaultValue: "paid" },
      { name: "paid_at", label: "Data do pagamento", type: "date" },
      { name: "payment_method", label: "Forma de pagamento", type: "select", options: PAYMENT_METHODS.map((c) => ({ value: c, label: c })) },
      { name: "project_id", label: "Projeto (custo)", type: "relation", relation: { table: "projects", labelColumn: "name" } },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
  },
  resource: {
    table: "resources", singular: "recurso", plural: "Biblioteca",
    fields: [
      { name: "title", label: "Título", type: "text", required: true, full: true },
      { name: "type", label: "Tipo", type: "select", options: [
        { value: "link", label: "Link" }, { value: "template", label: "Template" }, { value: "snippet", label: "Snippet de código" },
        { value: "reference", label: "Referência visual" }, { value: "tool", label: "Ferramenta" }], defaultValue: "link" },
      { name: "url", label: "URL", type: "url", placeholder: "https://" },
      { name: "favorite", label: "Favorito", type: "checkbox", defaultValue: false },
      { name: "content", label: "Conteúdo / anotações", type: "textarea", full: true },
    ],
  },
} satisfies Record<string, EntityDef>;

export type EntityKey = keyof typeof ENTITIES;

export function defaultsFor(def: EntityDef) {
  const v: Record<string, unknown> = {};
  for (const f of def.fields) {
    v[f.name] = f.defaultValue === "__today" ? today() : f.defaultValue ?? (f.type === "checkbox" ? false : "");
  }
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida e normaliza os valores do formulário. */
export function validate(def: EntityDef, values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    let v = values[f.name];
    if (typeof v === "string") v = v.trim();
    if (f.required && (v === "" || v === null || v === undefined)) { errors[f.name] = "Campo obrigatório"; continue; }
    if (v === "" || v === undefined) { out[f.name] = f.type === "checkbox" ? false : null; continue; }
    switch (f.type) {
      case "email":
        if (!EMAIL_RE.test(String(v))) errors[f.name] = "E-mail inválido";
        out[f.name] = String(v).toLowerCase();
        break;
      case "url": {
        let s = String(v);
        if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
        try { new URL(s); out[f.name] = s; } catch { errors[f.name] = "URL inválida"; }
        break;
      }
      case "money":
      case "number": {
        const raw = String(v);
        const n = typeof v === "number" ? v : Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
        if (!Number.isFinite(n) || n < 0) errors[f.name] = "Valor inválido";
        else if (f.required && n <= 0) errors[f.name] = "Informe um valor maior que zero";
        out[f.name] = n;
        break;
      }
      case "datetime":
        out[f.name] = new Date(String(v)).toISOString();
        break;
      case "checkbox":
        out[f.name] = Boolean(v);
        break;
      default:
        out[f.name] = String(v).slice(0, 5000);
    }
  }
  return { errors, data: { ...out, ...(def.fixed ?? {}) } };
}
