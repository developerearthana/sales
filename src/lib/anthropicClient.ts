import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!config.anthropicApiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey: config.anthropicApiKey });
  return _client;
}

// Cached system prompt for Gridwise™ — reused across requests via prompt caching
const GRIDWISE_SYSTEM: Anthropic.TextBlockParam = {
  type: "text",
  text: `You are the outreach specialist for Gridwise™, the industrial re-engineering vertical of Earthana EESPL, headquartered at #1/1 Bharathi Street, Saidapet, Chennai 600015, Tamil Nadu.

Gridwise™ transforms legacy factory floors into lean, certified, export-ready workspaces through:
• Intelligent floor layout redesign — 30-35% operational cost reduction
• Lean manufacturing integration — ISO/Lean certification in 90 days
• Biophilic industrial landscaping — 18-22% reduction in absenteeism
• Energy efficiency re-engineering — 28% average energy savings
• Net Zero / Green Certification roadmap (ISO 14001, LEED Industrial)

Primary contacts:
• Suganya A — Architect & Co-Founder (spatial intelligence, factory re-engineering)
• HVAC & Lean consultants on-site
• Email: info@earthana.in | Phone: +91 99446 70888

Target sectors: Manufacturing / Automotive / Textile / Pharma / Food Processing
Target geography: Tamil Nadu — Chennai (Ambattur, Guindy, OMR), Coimbatore, SIPCOT, Oragadam, Sriperumbudur
Target contacts: Plant Directors, Founders/MDs, Operations Heads, Facility Managers, Sustainability Officers

Writing style: Direct, credibility-led, never generic. First sentence must be specific to the prospect.`,
  // @ts-ignore — prompt caching header
  cache_control: { type: "ephemeral" }
};

export type EmailStyle = "efficiency" | "sustainability" | "export" | "direct" | "wellbeing";

const STYLE_GUIDE: Record<EmailStyle, string> = {
  efficiency:   "Lead with 30-35% cost reduction from lean floor redesign. Mention specific movement-time waste.",
  sustainability: "Lead with Net Zero targets and green certification. Mention biophilic landscaping outcomes.",
  export:       "Lead with ISO certification readiness. Mention compliance audits and export buyer expectations.",
  direct:       "Ultra-short — one question about their factory floor, nothing else. Max 80 words.",
  wellbeing:    "Lead with employee wellbeing, absenteeism data, and modern workspace ROI."
};

export async function generateLeadEmail(params: {
  name: string;
  company: string;
  title: string;
  industry: string;
  location: string;
  intentSignals: string[];
  hook?: string;
  style: EmailStyle;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const { name, company, title, industry, location, intentSignals, hook, style } = params;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: [GRIDWISE_SYSTEM as any],
    messages: [{
      role: "user",
      content: `Write a personalised B2B cold outreach email.

Recipient:
- Name: ${name || "the contact"}
- Company: ${company}
- Title: ${title || "Plant/Operations Head"}
- Industry: ${industry}
- Location: ${location}
- Intent signals: ${intentSignals.length ? intentSignals.join(", ") : "none detected"}
- Specific hook: ${hook || "none"}

Style directive: ${STYLE_GUIDE[style]}

Formatting rules:
1. Open with "Hi ${name.split(" ")[0] || "there"},"
2. First sentence MUST be specific to ${company} or ${industry} in ${location}
3. Under 180 words total
4. No fluffy openers ("I hope this email finds you…")
5. End CTA: offer a free 30-min factory floor walk or 20-min call
6. Sign off as: Gridwise™ Team | Earthana (EESPL) | info@earthana.in | +91 99446 70888`
    }]
  });

  return (msg.content[0] as Anthropic.TextBlock).text;
}

export async function generateCallScript(lead: {
  name?: string;
  company?: string;
  industry?: string;
  isIndustrial?: boolean;
  location?: string;
}): Promise<string> {
  const client = getClient();
  const company = lead.company || "your company";

  if (!client) {
    return `Hello${lead.name ? ` ${lead.name.split(" ")[0]}` : ""}. This is a brief message from Gridwise, Earthana's industrial re-engineering team based in Chennai. We help manufacturing units in Tamil Nadu cut operational costs by 30 to 35 percent through intelligent factory floor redesign without stopping production. We would love to offer ${company} a complimentary floor assessment. Please reach us at info at earthana dot in or call 9944670888. Thank you.`;
  }

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 180,
    system: [GRIDWISE_SYSTEM as any],
    messages: [{
      role: "user",
      content: `Write a 30-second spoken voice script (no markdown, no special characters) for a cold call to:
Name: ${lead.name || "the contact"}
Company: ${company}
Industry: ${lead.industry || (lead.isIndustrial ? "Manufacturing" : "Business")}
Location: ${lead.location || "Tamil Nadu"}

Rules: conversational natural speech, no punctuation symbols (use commas and periods only), end with callback to info@earthana.in or 9944670888`
    }]
  });

  return (msg.content[0] as Anthropic.TextBlock).text;
}

export async function scoreLeadFit(lead: {
  company?: string;
  title?: string;
  industry?: string;
  intentSignals?: string[];
  location?: string;
}): Promise<{ score: number; reasoning: string }> {
  const client = getClient();
  if (!client) return { score: 50, reasoning: "AI scoring not configured" };

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      system: [GRIDWISE_SYSTEM as any],
      messages: [{
        role: "user",
        content: `Rate this lead's fit for Gridwise™ industrial re-engineering services (0-100).
Company: ${lead.company}, Title: ${lead.title}, Industry: ${lead.industry}, Signals: ${lead.intentSignals?.join(", ") || "none"}, Location: ${lead.location}
Respond ONLY with valid JSON: {"score": <0-100>, "reasoning": "<one sentence>"}`
      }]
    });
    return JSON.parse((msg.content[0] as Anthropic.TextBlock).text);
  } catch {
    return { score: 50, reasoning: "Lead scoring failed" };
  }
}

export async function suggestNextAction(lead: {
  interest_status?: string;
  last_contacted?: string;
  human_review_required?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const client = getClient();
  if (!client) return "Send a follow-up email";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 80,
    system: [GRIDWISE_SYSTEM as any],
    messages: [{
      role: "user",
      content: `Given lead status "${lead.interest_status}", last contacted "${lead.last_contacted || "never"}", human review needed: ${lead.human_review_required ? "yes" : "no"}, what is the single best next action? Respond in 1 sentence only.`
    }]
  });

  return (msg.content[0] as Anthropic.TextBlock).text.trim();
}

export function isAIConfigured(): boolean {
  return !!config.anthropicApiKey;
}
