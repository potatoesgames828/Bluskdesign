export type Priority = "low" | "medium" | "high";
export type PlanId = "free" | "pro" | "elite";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  company: string | null;
  role: "user" | "admin";
  preferences: Preferences;
  created_at: string;
}
export interface Preferences {
  theme?: "dark" | "light";
  locale?: "pt-BR" | "en-US" | "es-ES";
  currency?: "BRL" | "USD" | "EUR";
  notifications?: { email?: boolean; in_app?: boolean };
  hunter_weights?: Partial<Record<string, number>>;
}
export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  sort_order: number;
}
export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}
export interface Client {
  id: string; name: string; company: string | null; email: string | null; phone: string | null;
  whatsapp: string | null; address: string | null; category: string | null; status: string;
  notes: string | null; created_at: string;
}
export interface Lead {
  id: string; company_name: string; contact_name: string | null; email: string | null; phone: string | null;
  whatsapp: string | null; website: string | null; instagram: string | null; address: string | null;
  neighborhood: string | null; city: string | null; state: string | null; country: string | null;
  segment: string | null; source: string; external_id: string | null; lat: number | null; lng: number | null;
  rating: number | null; rating_count: number | null; score: number | null; score_breakdown: unknown;
  priority: Priority; status: string; notes: string | null; last_contact_at: string | null;
  verified_at: string | null; created_at: string;
}
export type Stage = "new" | "first_contact" | "waiting" | "negotiation" | "proposal" | "won" | "lost";
export interface Opportunity {
  id: string; title: string; company: string | null; contact_name: string | null; value: number;
  segment: string | null; owner: string | null; priority: Priority; stage: Stage; position: number;
  client_id: string | null; lead_id: string | null; notes: string | null; reminder_at: string | null;
  closed_at: string | null; last_interaction_at: string; created_at: string;
}
export interface Interaction {
  id: string; opportunity_id: string | null; client_id: string | null; type: string; content: string;
  metadata: Record<string, unknown>; created_at: string;
}
export type ProjectStatus = "planning" | "waiting" | "in_progress" | "review" | "approval" | "done" | "canceled";
export interface Project {
  id: string; name: string; description: string | null; client_id: string | null; category: string | null;
  contract_value: number; estimated_cost: number; start_date: string | null; due_date: string | null;
  owner: string | null; status: ProjectStatus; created_at: string; updated_at: string;
}
export interface Task {
  id: string; project_id: string | null; title: string; description: string | null; assignee: string | null;
  priority: Priority; due_date: string | null; done: boolean; done_at: string | null; created_at: string;
}
export interface PortfolioItem {
  id: string; title: string; client_name: string | null; client_id: string | null; category: string | null;
  description: string | null; cover_url: string | null; gallery: string[]; demo_url: string | null;
  completed_at: string | null; published: boolean; position: number; created_at: string;
}
export interface Transaction {
  id: string; type: "income" | "expense"; description: string; category: string | null; amount: number;
  client_id: string | null; project_id: string | null; date: string; paid_at: string | null;
  payment_method: string | null; status: "paid" | "pending" | "canceled"; notes: string | null; created_at: string;
}
export interface Notification {
  id: string; type: string; category: string; title: string; body: string; link: string | null;
  read_at: string | null; created_at: string;
}
export interface ActivityLog {
  id: string; entity: string; entity_id: string | null; action: string; summary: string; link: string | null; created_at: string;
}
