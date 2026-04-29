import {
  scrapeWebsiteForContacts,
  searchIndustryDirectory,
  type ScrapedContact,
  type DirectorySource
} from "../../lib/scraperClient";
import { analyzeWebsite, scoreLeadFit, isAIConfigured } from "../../lib/anthropicClient";
import { saveLeadState, createLeadNotification } from "../../lib/agentManager";

export type ScraperSource = "website" | DirectorySource;

export type ScraperPayload = {
  url: string;
  source?: ScraperSource;
  targetTitles?: string[];
  maxContacts?: number;
  saveAll?: boolean;
  saveIds?: string[];
};

export type ScoredContact = ScrapedContact & { aiScore: number; aiReasoning: string };

export async function scraperAgent(body: unknown) {
  const payload = body as ScraperPayload;
  if (!payload?.url?.trim()) throw new Error("Missing url");

  const source: ScraperSource = payload.source ?? "website";
  let contacts: ScrapedContact[] = [];
  let pageTitle: string | undefined;
  let pageDescription: string | undefined;
  let scrapedContent = "";
  let domain: string | undefined;
  let analysis: Awaited<ReturnType<typeof analyzeWebsite>> | null = null;

  // ── Scrape ───────────────────────────────────────────────────────────────

  if (source === "website") {
    const profile = await scrapeWebsiteForContacts(payload.url, {
      targetTitles: payload.targetTitles,
      maxContacts: payload.maxContacts ?? 25
    });
    contacts      = profile.rawContacts;
    pageTitle     = profile.title;
    pageDescription = profile.description;
    scrapedContent = profile.content;
    domain        = profile.domain;
  } else {
    // Directory / social search — url field is used as the search query
    contacts = await searchIndustryDirectory({
      source,
      query: payload.url,
      location: "Tamil Nadu"
    });
  }

  // ── AI website analysis ──────────────────────────────────────────────────

  if (isAIConfigured() && source === "website" && scrapedContent) {
    try {
      analysis = await analyzeWebsite({
        url: payload.url,
        content: scrapedContent,
        pageTitle
      });
    } catch { /* non-blocking */ }
  }

  // ── Score every contact with AI ──────────────────────────────────────────

  const scored: ScoredContact[] = await Promise.all(
    contacts.map(async (c) => {
      let aiScore = { score: analysis?.gridwiseFit ?? 50, reasoning: "Inherited company score" };
      if (isAIConfigured() && (c.title || c.company)) {
        try {
          aiScore = await scoreLeadFit({
            company: c.company ?? analysis?.companyName ?? domain,
            title: c.title,
            industry: analysis?.industry ?? "Manufacturing",
            intentSignals: analysis?.intentSignals ?? [],
            location: analysis?.location ?? "Tamil Nadu"
          });
        } catch { /* keep default */ }
      }
      return { ...c, aiScore: aiScore.score, aiReasoning: aiScore.reasoning };
    })
  );

  // Sort descending by AI score
  scored.sort((a, b) => b.aiScore - a.aiScore);

  // ── Save contacts to CRM ─────────────────────────────────────────────────

  let savedCount = 0;
  const savedIds: string[] = [];

  const toSave: ScoredContact[] = payload.saveAll
    ? scored
    : payload.saveIds?.length
      ? scored.filter((c) => payload.saveIds!.includes(c.id))
      : [];

  for (const contact of toSave) {
    try {
      const leadId = contact.id;
      await saveLeadState({
        id: leadId,
        email: contact.email ?? "",
        name: contact.name ?? "",
        company: contact.company ?? analysis?.companyName ?? domain ?? "",
        title: contact.title ?? analysis?.targetTitles?.[0] ?? "",
        interest_status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: `scraper:${source}`,
          scraperUrl: payload.url,
          scraperDomain: domain,
          linkedin: contact.linkedin ?? null,
          phone: contact.phone ?? null,
          aiScore: contact.aiScore,
          aiReasoning: contact.aiReasoning,
          scraperSource: contact.source,
          ...(analysis && {
            companyAnalysis: {
              industry: analysis.industry,
              location: analysis.location,
              gridwiseFit: analysis.gridwiseFit,
              outreachAngle: analysis.outreachAngle,
              painPoints: analysis.painPoints
            }
          })
        }
      });

      await createLeadNotification(
        leadId,
        "scraper",
        `Scraped via ${source}: ${contact.name ?? contact.email ?? "contact"} at ${contact.company ?? domain ?? "company"}`,
        { source, url: payload.url, aiScore: contact.aiScore }
      );

      savedIds.push(leadId);
      savedCount++;
    } catch {
      // Best-effort — continue with others
    }
  }

  return {
    status: "scraped",
    source,
    url: payload.url,
    domain,
    pageTitle,
    contactsFound: scored.length,
    savedCount,
    savedIds,
    contacts: scored,
    analysis
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);
  try {
    const result = await scraperAgent(body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Scrape failed" });
  }
}
