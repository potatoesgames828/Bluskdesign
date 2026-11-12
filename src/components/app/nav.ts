import {
  LayoutDashboard, Activity, Bell, Sparkles, Wand2, Library, Radar, KanbanSquare, Contact, Target,
  Users, FolderKanban, ListChecks, GalleryHorizontalEnd, Wallet, TrendingUp, TrendingDown, FileBarChart,
  CreditCard, Settings, LifeBuoy, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; feature?: "ai" | "prompts" | "hunter" }
export const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Principal", items: [
    { href: "/app", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/atividades", label: "Atividades", icon: Activity },
    { href: "/app/notificacoes", label: "Notificações", icon: Bell },
  ] },
  { section: "Inteligência e criação", items: [
    { href: "/app/ai", label: "Blusk AI", icon: Sparkles, feature: "ai" },
    { href: "/app/prompts", label: "Gerador de prompts", icon: Wand2, feature: "prompts" },
    { href: "/app/biblioteca", label: "Biblioteca de recursos", icon: Library },
  ] },
  { section: "Prospecção e vendas", items: [
    { href: "/app/hunter", label: "Blusk Hunter", icon: Radar, feature: "hunter" },
    { href: "/app/crm", label: "CRM", icon: KanbanSquare },
    { href: "/app/contatos", label: "Contatos", icon: Contact },
    { href: "/app/oportunidades", label: "Oportunidades", icon: Target },
  ] },
  { section: "Gestão", items: [
    { href: "/app/clientes", label: "Clientes", icon: Users },
    { href: "/app/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/app/tarefas", label: "Tarefas", icon: ListChecks },
    { href: "/app/portfolio", label: "Portfólio", icon: GalleryHorizontalEnd },
  ] },
  { section: "Financeiro", items: [
    { href: "/app/financeiro", label: "Visão financeira", icon: Wallet },
    { href: "/app/financeiro/receitas", label: "Receitas", icon: TrendingUp },
    { href: "/app/financeiro/despesas", label: "Despesas", icon: TrendingDown },
    { href: "/app/financeiro/relatorios", label: "Relatórios", icon: FileBarChart },
  ] },
  { section: "Conta", items: [
    { href: "/app/assinatura", label: "Assinatura", icon: CreditCard },
    { href: "/app/configuracoes", label: "Configurações", icon: Settings },
    { href: "/app/ajuda", label: "Ajuda e suporte", icon: LifeBuoy },
  ] },
];
