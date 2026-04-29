import { parseLeadIntent } from "../../lib/intentParser";
import { saveLeadState, createLeadNotification } from "../../lib/agentManager";
import { config } from "../../lib/config";

export type LeadScoutPayload = {
  query: string;
  preferredTitle?: string;
  company?: string;
  email?: string;
  name?: string;
};

async function fetchApolloData(query: string): Promise<Record<string, unknown> | null> {
  if (!config.apolloApiKey) return null;
  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": config.apolloApiKey
      },
      body: JSON.stringify({ q_keywords: query, page: 1, per_page: 5 })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFirecrawlData(query: string): Promise<Record<string, unknown> | null> {
  if (!config.firecrawlApiKey) return null;
  return null;
}

export async function leadScoutAgent(body: unknown) {
  const payload = body as LeadScoutPayload;
  if (!payload?.query) {
    throw new Error("Missing lead scouting query");
  }

  const intent = parseLeadIntent(payload.query);
  const leadId = crypto.randomUUID();
  const leadSpec = {
    id: leadId,
    email: payload.email ?? "",
    name: payload.name ?? "",
    company: payload.company ?? intent.industry,
    title: payload.preferredTitle ?? intent.seniority,
    metadata: {
      intent,
      source: "leadScout",
      touchpoint: "lead discovery",
      gridwise: intent.isIndustrial
    }
  };

  const [apolloData, firecrawlData] = await Promise.all([
    fetchApolloData(payload.query),
    fetchFirecrawlData(payload.query)
  ]);

  const sources = [apolloData ? "apollo" : null, firecrawlData ? "firecrawl" : null].filter(Boolean) as string[];
  const confidence = Math.min(1, Math.round((intent.confidence + (sources.length > 0 ? 0.2 : 0)) * 100) / 100);

  // DB save is best-effort — agent always returns parsed intent even if Supabase is not configured
  let dbSaved = false;
  let dbWarning: string | undefined;
  try {
    await saveLeadState({
      ...leadSpec,
      interest_status: "scouting",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { ...leadSpec.metadata, sources, confidence }
    });
    await createLeadNotification(leadId, "lead_scout", "Gridwise™ Lead Scout created a new prospect profile.", {
      query: payload.query,
      sources,
      confidence,
      industry: intent.industry,
      location: intent.location
    });
    dbSaved = true;
  } catch (dbErr: any) {
    dbWarning = dbErr?.message ?? "Database unavailable — configure SUPABASE_URL and SUPABASE_KEY.";
    console.warn("[leadScout] DB save skipped:", dbWarning);
  }

  return {
    status: dbSaved ? "lead_scouted" : "lead_scouted_no_db",
    leadId,
    leadSpec,
    intent,
    sources,
    confidence,
    ...(dbWarning && { warning: dbWarning })
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);
  try {
    const result = await leadScoutAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
