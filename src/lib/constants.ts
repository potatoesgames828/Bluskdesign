import type { Stage, ProjectStatus, Priority } from "./types";

export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "new", label: "Novo lead", color: "#69A5FF" },
  { id: "first_contact", label: "Primeiro contato", color: "#3478F6" },
  { id: "waiting", label: "Aguardando resposta", color: "#A78BFA" },
  { id: "negotiation", label: "Em negociação", color: "#F59E0B" },
  { id: "proposal", label: "Proposta enviada", color: "#06B6D4" },
  { id: "won", label: "Fechado", color: "#22C55E" },
  { id: "lost", label: "Perdido", color: "#EF4444" },
];
export const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

export const PROJECT_STATUSES: { id: ProjectStatus; label: string; color: string }[] = [
  { id: "planning", label: "Planejamento", color: "#929BAD" },
  { id: "waiting", label: "Aguardando início", color: "#A78BFA" },
  { id: "in_progress", label: "Em desenvolvimento", color: "#3478F6" },
  { id: "review", label: "Em revisão", color: "#06B6D4" },
  { id: "approval", label: "Aguardando aprovação", color: "#F59E0B" },
  { id: "done", label: "Concluído", color: "#22C55E" },
  { id: "canceled", label: "Cancelado", color: "#EF4444" },
];
export const projectStatusLabel = (s: string) => PROJECT_STATUSES.find((x) => x.id === s)?.label ?? s;

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "low", label: "Baixa" },
  { id: "medium", label: "Média" },
  { id: "high", label: "Alta" },
];
export const priorityLabel = (p: string) => PRIORITIES.find((x) => x.id === p)?.label ?? p;

export const LEAD_STATUSES = [
  { id: "new", label: "Novo" },
  { id: "contacted", label: "Contatado" },
  { id: "qualified", label: "Qualificado" },
  { id: "converted", label: "Convertido" },
  { id: "discarded", label: "Descartado" },
];

export const TX_STATUSES = [
  { id: "paid", label: "Efetivado" },
  { id: "pending", label: "Pendente" },
  { id: "canceled", label: "Cancelado" },
];

export const PAYMENT_METHODS = ["Pix", "Boleto", "Cartão de crédito", "Cartão de débito", "Transferência", "Dinheiro", "Outro"];
export const INCOME_CATEGORIES = ["Projeto", "Mensalidade", "Manutenção", "Consultoria", "Hospedagem", "Outros"];
export const EXPENSE_CATEGORIES = ["Software", "Infraestrutura", "Marketing", "Impostos", "Equipe", "Equipamentos", "Escritório", "Outros"];

export const SEGMENTS = [
  "Oficinas mecânicas", "Barbearias", "Clínicas", "Pet shops", "Lojas de roupas", "Academias",
  "Imobiliárias", "Assistências técnicas", "Padarias", "Restaurantes", "Salões de beleza",
  "Escritórios de contabilidade", "Prestadores de serviços",
];

export const BR_STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export const PROMPT_CATEGORIES = [
  { id: "sites", label: "Desenvolvimento de sites" },
  { id: "landing", label: "Landing pages" },
  { id: "webapps", label: "Aplicações web" },
  { id: "motion", label: "Motion graphics" },
  { id: "ads", label: "Anúncios" },
  { id: "marketing", label: "Marketing" },
  { id: "images", label: "Imagens" },
  { id: "videos", label: "Vídeos" },
  { id: "automation", label: "Automação" },
  { id: "code", label: "Programação" },
];
