import { config } from "./config";
import { searchPeople, apolloPersonToLeadSpec, isApolloConfigured } from "./apolloClient";

export type ScrapedContact = {
  id: string;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  company?: string;
  source: string;
  confidence: number;
  aiScore?: number;
  aiReasoning?: string;
  metadata?: Record<string, unknown>;
};

export type WebsiteProfile = {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  content: string;
  rawContacts: ScrapedContact[];
};

export type DirectorySource = "sipcot" | "indiamart" | "cii" | "linkedin";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

// ── Utility ────────────────────────────────────────────────────────────────

export function extractDomain(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

// Extract emails, phones, LinkedIn URLs from markdown text
function extractFromMarkdown(markdown: string, source: string, company?: string): ScrapedContact[] {
  const contacts: ScrapedContact[] = [];
  const emailRe = /[\w.+%-]+@[\w-]+\.[\w.]+/g;
  const phoneRe = /(?:\+91[\s\-.]?|0)?[6-9]\d{4}[\s\-.]?\d{5}/g;
  const linkedinRe = /https?:\/\/(?:www\.)?linkedin\.com\/in\/([\w-]+)/g;

  const emails = [...new Set(
    (markdown.match(emailRe) ?? []).filter(
      (e) => !e.match(/\.(png|jpg|svg|gif|css|js)$/) && !e.includes("example.")
    )
  )];
  const phones = [...new Set(markdown.match(phoneRe) ?? [])];
  const linkedins = [...new Set(markdown.match(linkedinRe) ?? [])];

  for (const email of emails) {
    contacts.push({ id: crypto.randomUUID(), email, company, source, confidence: 0.75 });
  }
  for (const linkedin of linkedins) {
    if (!contacts.find((c) => c.linkedin === linkedin)) {
      contacts.push({ id: crypto.randomUUID(), linkedin, company, source, confidence: 0.6 });
    }
  }
  if (phones.length > 0 && contacts.length > 0) {
    contacts[0].phone = phones[0];
  }

  return contacts;
}

// ── Firecrawl API ──────────────────────────────────────────────────────────

async function firecrawlRequest(endpoint: string, body: Record<string, unknown>) {
  if (!config.firecrawlApiKey) return null;
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.firecrawlApiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function scrapeUrl(url: string): Promise<{ markdown: string; title?: string; description?: string } | null> {
  const data = await firecrawlRequest("scrape", { url, formats: ["markdown"] });
  if (!data?.data?.markdown) return null;
  return {
    markdown: data.data.markdown as string,
    title: data.data.metadata?.title ?? undefined,
    description: data.data.metadata?.description ?? undefined
  };
}

// Use Firecrawl LLM extract to pull structured contact data
async function extractContactsFromUrl(url: string): Promise<ScrapedContact[]> {
  const data = await firecrawlRequest("scrape", {
    url,
    formats: ["extract"],
    extract: {
      prompt:
        "Extract all people mentioned on this page: their full name, job title/designation, email address, phone number, and LinkedIn URL. Include founders, directors, managers, executives, and any key contacts.",
      schema: {
        type: "object",
        properties: {
          people: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                title: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                linkedin: { type: "string" }
              }
            }
          }
        }
      }
    }
  });

  const people: Array<Record<string, string>> = data?.data?.extract?.people ?? [];
  return people
    .filter((p) => p.name || p.email)
    .map((p) => ({
      id: crypto.randomUUID(),
      name: p.name || undefined,
      title: p.title || undefined,
      email: p.email || undefined,
      phone: p.phone || undefined,
      linkedin: p.linkedin || undefined,
      source: `firecrawl:${url}`,
      confidence: 0.85
    }));
}

// Search industry directories via Firecrawl search
export async function searchIndustryDirectory(params: {
  source: DirectorySource | "website";
  query: string;
  location?: string;
}): Promise<ScrapedContact[]> {
  if (!config.firecrawlApiKey) return [];

  const loc = params.location ?? "Tamil Nadu";
  const queries: Record<string, string> = {
    sipcot:   `site:sipcot.com OR site:tidco.com "${params.query}" "${loc}" factory company contact`,
    indiamart: `site:indiamart.com "${params.query}" manufacturer supplier "${loc}" contact enquiry`,
    cii:      `site:cii.in OR site:ciisouthernregion.in "${params.query}" member manufacturer "${loc}"`,
    linkedin:  `site:linkedin.com/company "${params.query}" manufacturing "${loc}"`,
    website:  `"${params.query}" manufacturing factory plant "${loc}" site:*.in contact`
  };

  const data = await firecrawlRequest("search", {
    query: queries[params.source] ?? queries.website,
    limit: 8,
    scrapeOptions: { formats: ["markdown"] }
  });

  if (!data?.data) return [];

  const contacts: ScrapedContact[] = [];
  for (const result of data.data as Array<{ markdown?: string; url?: string }>) {
    const extracted = extractFromMarkdown(result.markdown ?? "", `${params.source}:${result.url}`, params.query);
    contacts.push(...extracted);
  }
  return contacts.slice(0, 25);
}

// ── Main scraper ───────────────────────────────────────────────────────────

export async function scrapeWebsiteForContacts(
  url: string,
  options?: {
    targetTitles?: string[];
    maxContacts?: number;
  }
): Promise<WebsiteProfile> {
  const normalized = normalizeUrl(url);
  const domain = extractDomain(url);
  const maxContacts = options?.maxContacts ?? 25;

  const pageSlugs = [
    "",
    "/about",
    "/about-us",
    "/team",
    "/our-team",
    "/leadership",
    "/contact",
    "/contact-us"
  ];

  let fullMarkdown = "";
  let title: string | undefined;
  let description: string | undefined;

  // Scrape all candidate pages in parallel (Firecrawl)
  const scrapeResults = await Promise.allSettled(
    pageSlugs.map((slug) => scrapeUrl(`${normalized}${slug}`))
  );
  for (const r of scrapeResults) {
    if (r.status === "fulfilled" && r.value) {
      fullMarkdown += "\n\n" + r.value.markdown;
      if (!title) title = r.value.title;
      if (!description) description = r.value.description;
    }
  }

  // Regex-based contact extraction from raw markdown
  const rawContacts = extractFromMarkdown(fullMarkdown, `website:${domain}`, domain);

  // Firecrawl LLM extraction on top 3 pages (team, about, contact)
  const extractResults = await Promise.allSettled(
    [normalized, `${normalized}/team`, `${normalized}/contact`].map(extractContactsFromUrl)
  );
  for (const r of extractResults) {
    if (r.status === "fulfilled") rawContacts.push(...r.value);
  }

  // Apollo.io domain search for professional contacts
  if (isApolloConfigured()) {
    try {
      const apolloResult = await searchPeople({
        query: domain,
        titles: options?.targetTitles ?? [
          "Plant Manager", "Plant Director", "Operations Head",
          "Managing Director", "MD", "Founder", "CEO",
          "Facility Manager", "Sustainability Officer"
        ],
        perPage: 15
      });
      for (const person of apolloResult.people) {
        const spec = apolloPersonToLeadSpec(person);
        rawContacts.push({
          id: spec.id,
          name: person.name,
          title: person.title,
          email: person.email,
          phone: person.phone_numbers?.[0]?.sanitized_number,
          linkedin: person.linkedin_url,
          company: person.organization_name,
          source: "apollo",
          confidence: 0.9,
          metadata: spec.metadata as Record<string, unknown>
        });
      }
    } catch {
      // Apollo enrichment optional
    }
  }

  // Deduplicate by email → linkedin → name
  const seen = new Set<string>();
  const unique = rawContacts.filter((c) => {
    const key = c.email ?? c.linkedin ?? (c.name && `name:${c.name}`) ?? c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    url: normalized,
    domain,
    title,
    description,
    content: fullMarkdown.slice(0, 8000),
    rawContacts: unique.slice(0, maxContacts)
  };
}

export function isFirecrawlConfigured(): boolean {
  return !!config.firecrawlApiKey;
}
