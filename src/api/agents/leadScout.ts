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

async function fetchApolloData(query: string) {
  if (!config.apolloApiKey) {
    return null;
  }
  // Placeholder for Apollo.io integration or enhanced contact discovery.
  return null;
}

async function fetchFirecrawlData(query: string) {
  if (!config.firecrawlApiKey) {
    return null;
  }
  // Placeholder for Firecrawl scraping of an 'About' page.
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
      touchpoint: "lead discovery"
    }
  };

  const apolloData = await fetchApolloData(payload.query);
  const firecrawlData = await fetchFirecrawlData(payload.query);

  const sources = [apolloData ? "apollo" : null, firecrawlData ? "firecrawl" : null].filter(Boolean);
  const confidence = Math.round((intent.confidence + (sources.length > 0 ? 0.2 : 0)) * 100) / 100;

  await saveLeadState({
    ...leadSpec,
    interest_status: "scouting",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...leadSpec.metadata,
      sources,
      confidence
    }
  });

  await createLeadNotification(leadId, "lead_scout", "Lead scout agent created a new prospect profile.", {
    query: payload.query,
    sources,
    confidence
  });

  return {
    status: "lead_scouted",
    leadId,
    leadSpec,
    intent,
    sources,
    confidence
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  try {
    const result = await leadScoutAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
