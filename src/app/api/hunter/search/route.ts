import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hasFeature, consumeUsage } from "@/lib/session";
import { qualify, classifyWebsite, instagramFromWebsite, type Weights } from "@/lib/hunter/scoring";

const Body = z.object({
  country: z.string().trim().max(60).default("Brasil"),
  state: z.string().trim().max(60).optional(),
  city: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().max(80).optional(),
  segment: z.string().trim().min(2).max(80),
  category: z.string().trim().max(80).optional(),
  name: z.string().trim().max(120).optional(),
  website: z.enum(["any", "with", "without"]).default("any"),
  social: z.enum(["any", "social_only"]).default("any"),
  pageToken: z.string().max(2000).optional(),
});

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string };
  googleMapsUri?: string;
  regularOpeningHours?: unknown;
  businessStatus?: string;
}

const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber", "places.internationalPhoneNumber",
  "places.websiteUri", "places.rating", "places.userRatingCount", "places.location", "places.primaryTypeDisplayName",
  "places.googleMapsUri", "places.regularOpeningHours", "places.businessStatus", "nextPageToken",
].join(",");

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasFeature(s.plan, "hunter")) return NextResponse.json({ error: "O Blusk Hunter está disponível no plano Elite." }, { status: 403 });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "Integração não configurada: defina GOOGLE_PLACES_API_KEY no servidor para realizar pesquisas reais." }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Filtros inválidos." }, { status: 400 });
  const f = parsed.data;
  if (!f.pageToken && !(await consumeUsage("hunter_searches", s.plan))) return NextResponse.json({ error: "Limite mensal de pesquisas do seu plano atingido." }, { status: 429 });

  const where = [f.neighborhood, f.city, f.state, f.country].filter(Boolean).join(", ");
  const textQuery = `${[f.name, f.category || f.segment].filter(Boolean).join(" ")} em ${where}`;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({ textQuery, languageCode: "pt-BR", regionCode: "BR", pageSize: 20, ...(f.pageToken ? { pageToken: f.pageToken } : {}) }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `Erro ${res.status} na Google Places API.`;
    return NextResponse.json({ error: `Google Places: ${msg}` }, { status: 502 });
  }

  const weights = (s.profile.preferences?.hunter_weights ?? {}) as Partial<Weights>;
  const now = new Date().toISOString();
  const { data: existing } = await s.supabase.from("leads").select("external_id").not("external_id", "is", null);
  const saved = new Set((existing ?? []).map((e) => e.external_id));

  let results = ((json.places ?? []) as Place[]).filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY").map((p) => {
    const q = qualify({
      name: p.displayName?.text ?? "", category: p.primaryTypeDisplayName?.text, segment: f.segment, website: p.websiteUri,
      phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber, rating: p.rating, ratingCount: p.userRatingCount,
      address: p.formattedAddress, hasHours: p.regularOpeningHours ? true : false,
    }, weights);
    const phone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
    const mobile = phone ? /\(?\d{2}\)?\s?9\d{4}-?\d{4}/.test(phone) : false;
    return {
      externalId: p.id,
      name: p.displayName?.text ?? "Sem nome",
      category: p.primaryTypeDisplayName?.text ?? f.segment,
      address: p.formattedAddress ?? null,
      phone,
      whatsapp: mobile ? phone : null,
      website: p.websiteUri ?? null,
      websiteKind: classifyWebsite(p.websiteUri),
      instagram: instagramFromWebsite(p.websiteUri),
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      mapsUrl: p.googleMapsUri ?? null,
      source: "Google Places API",
      verifiedAt: now,
      saved: saved.has(p.id),
      qualification: q,
    };
  });

  if (f.website === "with") results = results.filter((r) => r.websiteKind === "own_site" || r.websiteKind === "builder");
  if (f.website === "without") results = results.filter((r) => r.websiteKind === "none_listed" || r.websiteKind === "social_only");
  if (f.social === "social_only") results = results.filter((r) => r.websiteKind === "social_only");

  return NextResponse.json({ query: textQuery, results, nextPageToken: json.nextPageToken ?? null });
}
