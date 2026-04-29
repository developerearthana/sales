import { parseLeadIntent } from "../../lib/intentParser";
import { saveLeadState, createLeadNotification } from "../../lib/agentManager";
import { searchPeople, apolloPersonToLeadSpec, isApolloConfigured } from "../../lib/apolloClient";
import { scoreLeadFit, isAIConfigured } from "../../lib/anthropicClient";

export type LeadScoutPayload = {
  query: string;
  preferredTitle?: string;
  company?: string;
  email?: string;
  name?: string;
  perPage?: number;
};

export async function leadScoutAgent(body: unknown) {
  const payload = body as LeadScoutPayload;
  if (!payload?.query) throw new Error("Missing lead scouting query");

  const intent = parseLeadIntent(payload.query);

  // Build Apollo search titles + locations from intent
  const titles = intent.seniority
    ? [intent.seniority, "Plant Manager", "Operations Head", "MD", "Founder"]
    : ["Plant Manager", "Operations Head", "Facility Manager", "MD"];

  const locations = intent.location
    ? [intent.location, "Tamil Nadu", "Chennai", "Coimbatore"]
    : ["Tamil Nadu", "Chennai", "Coimbatore", "Oragadam", "Sriperumbudur"];

  let apolloLeads: Array<Record<string, unknown>> = [];
  let apolloError: string | undefined;

  if (isApolloConfigured()) {
    try {
      const result = await searchPeople({
        query: payload.query,
        titles: payload.preferredTitle ? [payload.preferredTitle, ...titles] : titles,
        locations,
        perPage: payload.perPage ?? 10
      });

      // Score each lead with AI and build lead specs
      apolloLeads = await Promise.all(
        result.people.map(async (person) => {
          const spec = apolloPersonToLeadSpec(person);
          let aiScore = { score: intent.gridwiseScore ?? 50, reasoning: "Intent-based score" };

          if (isAIConfigured()) {
            try {
              aiScore = await scoreLeadFit({
                company: person.organization_name,
                title: person.title,
                industry: intent.industry,
                intentSignals: intent.intentSignals,
                location: person.city ? `${person.city}, ${person.state}` : intent.location
              });
            } catch {
              // AI scoring failed — use intent score
            }
          }

          return {
            ...spec,
            aiScore: aiScore.score,
            aiReasoning: aiScore.reasoning,
            interest_status: "scouting",
            metadata: {
              ...spec.metadata,
              intent,
              aiScore: aiScore.score,
              aiReasoning: aiScore.reasoning,
              sources: ["apollo"]
            }
          };
        })
      );
    } catch (err: any) {
      apolloError = err?.message ?? "Apollo search failed";
      console.warn("[leadScout] Apollo search failed:", apolloError);
    }
  }

  // If Apollo returned no results, create a single lead from the query
  if (apolloLeads.length === 0) {
    const spec = {
      id: crypto.randomUUID(),
      email: payload.email ?? "",
      name: payload.name ?? "",
      company: payload.company ?? intent.industry,
      title: payload.preferredTitle ?? intent.seniority,
      interest_status: "scouting",
      metadata: {
        intent,
        source: "manual",
        gridwise: intent.isIndustrial,
        aiScore: intent.gridwiseScore
      }
    };
    apolloLeads = [spec];
  }

  // Save all leads to DB (best-effort)
  const savedIds: string[] = [];
  const dbErrors: string[] = [];

  for (const lead of apolloLeads) {
    try {
      await saveLeadState({
        ...lead,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      await createLeadNotification(
        lead.id as string,
        "lead_scout",
        `Gridwise™ Lead Scout: ${lead.name || "prospect"} at ${lead.company || intent.industry}`,
        {
          query: payload.query,
          aiScore: (lead as any).aiScore,
          industry: intent.industry,
          location: intent.location,
          sources: (lead.metadata as any)?.sources ?? []
        }
      );
      savedIds.push(lead.id as string);
    } catch (err: any) {
      dbErrors.push(err?.message ?? "DB save failed");
      console.warn("[leadScout] DB save skipped for lead:", lead.id, err?.message);
    }
  }

  const primaryLead = apolloLeads[0];

  return {
    status: savedIds.length > 0 ? "lead_scouted" : "lead_scouted_no_db",
    leadCount: apolloLeads.length,
    savedCount: savedIds.length,
    leadId: primaryLead?.id as string,
    leadSpec: primaryLead,
    leads: apolloLeads,
    intent,
    confidence: Math.min(1, Math.round((intent.confidence + (isApolloConfigured() ? 0.2 : 0)) * 100) / 100),
    sources: isApolloConfigured() && !apolloError ? ["apollo"] : [],
    ...(apolloError && { apolloError }),
    ...(dbErrors.length > 0 && { dbWarning: dbErrors[0] })
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);
  try {
    const result = await leadScoutAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
