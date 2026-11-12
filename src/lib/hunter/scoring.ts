/**
 * Blusk Hunter — qualificação de oportunidades.
 * Toda conclusão é baseada SOMENTE nos dados retornados pela fonte. Ausência de
 * dado na fonte NÃO é tratada como ausência confirmada.
 */
export interface PlaceData {
  name: string;
  category?: string | null;
  segment?: string | null;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  address?: string | null;
  hasHours?: boolean;
}

export const DEFAULT_WEIGHTS = {
  digital_presence: 35,
  site_quality: 20,
  contact: 20,
  segment_potential: 15,
  business_info: 10,
};
export type Weights = typeof DEFAULT_WEIGHTS;
export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  digital_presence: "Presença digital",
  site_quality: "Qualidade do site",
  contact: "Disponibilidade de contatos",
  segment_potential: "Potencial do segmento",
  business_info: "Informações comerciais",
};

const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "wa.me", "whatsapp.com", "linktr.ee", "linktree", "tiktok.com", "bio.link", "beacons.ai"];
const BUILDER_HOSTS = ["wixsite.com", "negocio.site", "business.site", "blogspot.", "wordpress.com", "webnode", "godaddysites.com", "ueniweb.com"];
const HIGH_POTENTIAL = ["clínica", "clinica", "imobili", "academia", "odonto", "estética", "estetica", "advoca", "contab", "restaurante", "pet"];

export interface Criterion {
  key: keyof Weights;
  label: string;
  weight: number;
  /** 0..1 — quão forte é a oportunidade neste critério */
  value: number;
  reason: string;
}

export interface Qualification {
  score: number;
  criteria: Criterion[];
  opportunities: string[];
  websiteKind: "none_listed" | "social_only" | "builder" | "own_site";
}

export function classifyWebsite(url?: string | null): Qualification["websiteKind"] {
  if (!url) return "none_listed";
  const u = url.toLowerCase();
  if (SOCIAL_HOSTS.some((h) => u.includes(h))) return "social_only";
  if (BUILDER_HOSTS.some((h) => u.includes(h))) return "builder";
  return "own_site";
}

export function instagramFromWebsite(url?: string | null) {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return m ? `@${m[1]}` : null;
}

export function qualify(p: PlaceData, weights: Partial<Weights> = {}): Qualification {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const kind = classifyWebsite(p.website);
  const criteria: Criterion[] = [];
  const opportunities: string[] = [];

  // 1. Presença digital
  if (kind === "none_listed") {
    criteria.push({ key: "digital_presence", label: WEIGHT_LABELS.digital_presence, weight: w.digital_presence, value: 1,
      reason: "Nenhum site informado no perfil público consultado (não confirma ausência de site)." });
    opportunities.push("Possível criação de site institucional — confirmar antes do contato.");
  } else if (kind === "social_only") {
    criteria.push({ key: "digital_presence", label: WEIGHT_LABELS.digital_presence, weight: w.digital_presence, value: 0.8,
      reason: "O link cadastrado aponta para rede social/agregador de links, não para um site próprio." });
    opportunities.push("Criação de site próprio para complementar as redes sociais.");
  } else {
    criteria.push({ key: "digital_presence", label: WEIGHT_LABELS.digital_presence, weight: w.digital_presence, value: 0.2,
      reason: "Site próprio informado no perfil público." });
  }

  // 2. Qualidade do site (somente evidências da URL)
  if (kind === "own_site" || kind === "builder") {
    const insecure = p.website!.toLowerCase().startsWith("http://");
    let v = 0.1; const reasons: string[] = [];
    if (kind === "builder") { v += 0.5; reasons.push("hospedado em construtor genérico/gratuito"); }
    if (insecure) { v += 0.4; reasons.push("URL sem HTTPS"); }
    criteria.push({ key: "site_quality", label: WEIGHT_LABELS.site_quality, weight: w.site_quality, value: Math.min(v, 1),
      reason: reasons.length ? `Evidências na URL: ${reasons.join(", ")}.` : "Sem evidências de desatualização na URL — avaliar manualmente." });
    if (reasons.length) opportunities.push("Modernização do site (evidências na URL informada).");
  } else {
    criteria.push({ key: "site_quality", label: WEIGHT_LABELS.site_quality, weight: w.site_quality, value: 0.5,
      reason: "Sem site próprio para avaliar." });
  }

  // 3. Contatos
  criteria.push({ key: "contact", label: WEIGHT_LABELS.contact, weight: w.contact, value: p.phone ? 1 : 0.2,
    reason: p.phone ? "Telefone público disponível para abordagem." : "Telefone não informado na fonte — abordagem mais difícil." });

  // 4. Potencial do segmento
  const seg = `${p.segment ?? ""} ${p.category ?? ""}`.toLowerCase();
  const high = HIGH_POTENTIAL.some((k) => seg.includes(k));
  criteria.push({ key: "segment_potential", label: WEIGHT_LABELS.segment_potential, weight: w.segment_potential, value: high ? 1 : 0.6,
    reason: high ? "Segmento com alta dependência de agendamento/vitrine online." : "Segmento com potencial padrão para serviços digitais." });
  if (/(restaurante|padaria|lanchonete|pizzaria|bar|café|cafe|food)/.test(seg))
    opportunities.push("Cardápio digital / pedidos online.");

  // 5. Informações comerciais
  const reviews = p.ratingCount ?? 0;
  let infoV = 0.3; const infoR: string[] = [];
  if (reviews >= 20) { infoV += 0.4; infoR.push(`${reviews} avaliações públicas indicam negócio ativo`); }
  else infoR.push(`${reviews} avaliações públicas`);
  if (p.hasHours === false) { infoV += 0.3; infoR.push("horário de funcionamento não informado"); opportunities.push("Completar informações comerciais (horários, serviços)."); }
  criteria.push({ key: "business_info", label: WEIGHT_LABELS.business_info, weight: w.business_info, value: Math.min(infoV, 1),
    reason: `${infoR.join("; ")}.` });

  const totalW = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const score = Math.round((criteria.reduce((a, c) => a + c.value * c.weight, 0) / totalW) * 100);
  return { score, criteria, opportunities, websiteKind: kind };
}
