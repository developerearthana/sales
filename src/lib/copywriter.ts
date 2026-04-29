import type { LeadIntent } from "./intentParser";

export type LeadRecord = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

const humanReviewTriggers = [
  /(price|pricing|cost|budget|investment|quote|proposal)/i,
  /(integration|api|connect|connects|crm|erp|system)/i,
  /(legal|contract|nda|agreement|compliance|audit)/i
];

export function detectHumanInLoopSignals(text: string, lead?: LeadRecord) {
  const combined = [text, lead?.metadata?.hook, lead?.metadata?.notes].filter(Boolean).join(" ");
  const matches = humanReviewTriggers.filter((re) => re.test(combined));
  return {
    requiresReview: matches.length > 0,
    reason: matches.length > 0
      ? `Detected sensitive signal: ${matches.map((r) => r.source).join(" | ")}`
      : "No human-review flags detected"
  };
}

// ── Gridwise™ factory modernisation email templates ──────────────────────────

function gridwiseTemplates(
  name: string,
  company: string,
  location: string,
  hook: string,
  baseMessage: string
): Array<{ subject: string; body: string }> {
  const hi = name && name !== "there" ? `Hi ${name},` : "Hi,";
  const loc = location || "Tamil Nadu";

  return [
    // Template 1 — The Efficiency Angle
    {
      subject: `Cutting 30%+ operational costs at ${company} — a quick idea from Gridwise™`,
      body: `${hi}

I came across ${company} while researching manufacturing units in ${loc} with strong output that may still have untapped operational efficiency.

At Gridwise™ (Earthana EESPL), we specialise in redesigning legacy factory floors to unlock lean, audit-ready production flows — without halting a single production line.

Results from recent Tamil Nadu engagements:
  • 32% reduction in material movement time
  • 90-day path to ISO/Lean certification readiness
  • 28% drop in energy consumption post re-layout

${baseMessage}

The first step is a complimentary 30-minute floor walk with Suganya (our Architect & Co-Founder) in Chennai. Would next week work?

— Gridwise™ Team | Earthana (EESPL)
info@earthana.in | +91 99446 70888`
    },

    // Template 2 — Net Zero / Sustainability
    {
      subject: `A Net Zero roadmap for ${company}'s plant — where to start`,
      body: `${hi}

Export buyer pressure and new sustainability mandates are changing what factory floors need to look like in 2025.

Gridwise™ by Earthana helps manufacturers in ${loc} redesign their physical infrastructure to hit Net Zero milestones without disrupting production.

We combine lean floor engineering with biophilic industrial landscaping — creating workspaces that perform and pass every audit.

Clients consistently achieve:
  ✓ 35% operational cost reduction
  ✓ Green certification readiness (ISO 14001, LEED Industrial)
  ✓ Measurably better employee retention from improved on-site environment

${baseMessage}

Can we set up a 20-minute call to assess where ${company} sits on the re-engineering curve?

— Gridwise™ | Earthana (EESPL)
info@earthana.in | +91 99446 70888`
    },

    // Template 3 — Export Readiness / Compliance
    {
      subject: `Getting ${company} export-ready — the floor layout piece`,
      body: `${hi}

Export buyers and international compliance teams are increasingly auditing factory floor design — not just product specifications.

This is where many strong manufacturers in ${loc} hit a wall: excellent products, but the facility layout fails ISO, OSHA, or buyer walkthroughs.

Gridwise™ is Earthana's industrial re-engineering vertical that bridges this gap. We redesign floor layouts, material flow, and facility infrastructure to make your plant audit-ready in under 90 days.

${baseMessage}

We'd love to do a complimentary floor review for ${company}. Can I share a 2-page case study from a similar plant we re-engineered in Ambattur?

— Gridwise™ | Earthana (EESPL)
info@earthana.in | +91 99446 70888`
    },

    // Template 4 — Short & Direct
    {
      subject: `Quick question about ${company}'s factory floor`,
      body: `${hi}

One question: when was the last time ${company}'s factory floor was professionally redesigned for lean production flow?

If the answer is "when we built it" — there's likely 30%+ operational efficiency sitting on the table.

We're Gridwise™, Earthana's industrial re-engineering team. We do this specifically for manufacturing units in ${loc}.

${baseMessage}

Worth a 20-minute call?

— Gridwise™ | info@earthana.in | +91 99446 70888`
    },

    // Template 5 — Biophilic / Employee Wellbeing
    {
      subject: `A different angle on ${company}'s productivity challenge`,
      body: `${hi}

Most manufacturers focus on machines and processes when improving output. We focus on the space itself.

Gridwise™ by Earthana redesigns industrial workspaces using biophilic design principles — natural light, green corridors, and intelligent flow paths — that make the factory environment a productivity multiplier.

Clients consistently report:
  • 18–22% reduction in workplace fatigue and absenteeism
  • Easier talent retention when the workspace is modern and welcoming
  • 35% operational cost reduction from integrated lean layout

${baseMessage}

We are currently working with units in SIPCOT and Oragadam. If ${company} is planning any facility work in the next 6 months, we'd love to be part of that conversation.

— Suganya A, Architect & Co-Founder | Earthana (EESPL)
info@earthana.in | +91 99446 70888`
    }
  ];
}

// ── Generic SaaS/tech templates (non-industrial leads) ───────────────────────

function genericTemplates(
  name: string,
  company: string,
  hook: string,
  baseMessage: string
): Array<{ subject: string; body: string }> {
  const hi = name && name !== "there" ? `Hi ${name},` : "Hi,";
  const firstLine = hook ? `I saw your recent work on ${hook}.` : `I noticed ${company}'s recent momentum.`;

  return [
    {
      subject: `A quick idea for ${company}`,
      body: `${hi}\n\n${firstLine} ${baseMessage}\n\nWould a 20-minute call make sense?\n\n— Earthana Team | info@earthana.in`
    },
    {
      subject: `${company} — a precise outreach idea`,
      body: `${hi}\n\n${firstLine}\n\nThis is a short note because your current focus stood out to me.\n\n${baseMessage}\n\n— Earthana Team | info@earthana.in`
    },
    {
      subject: `Staying relevant at ${company}`,
      body: `${hi}\n\n${firstLine}\n\nI know it's hard to cut through the noise.\n\n${baseMessage}\n\nTell me if you'd like a version tailored to your current stage.\n\n— Earthana Team | info@earthana.in`
    },
    {
      subject: `Quick note for ${company}`,
      body: `${hi}\n\nMost founders want a direct introduction, so I'll keep this brief.\n\n${baseMessage}\n\n— Earthana Team | info@earthana.in`
    },
    {
      subject: `An idea for ${company}`,
      body: `${hi}\n\n${firstLine}\n\n${baseMessage}\n\nHappy to share a two-line use case tailored to your team.\n\n— Earthana Team | info@earthana.in`
    }
  ];
}

export function generateEmailVariations(
  lead: LeadRecord,
  hook: string,
  baseMessage?: string,
  count = 5
): Array<{ id: string; subject: string; body: string; variation: number }> {
  const name = lead.name ?? "there";
  const company = lead.company ?? "your team";
  const intent = lead.metadata?.intent as LeadIntent | undefined;
  const location = intent?.location ?? "Tamil Nadu";
  const isIndustrial = intent?.isIndustrial ?? false;
  const message = baseMessage ?? (
    isIndustrial
      ? "I built a quick idea for transforming your factory floor into a lean, certified, export-ready workspace — without disrupting production."
      : "I built a quick outreach concept that keeps the first sentence specific and human."
  );

  const templates = isIndustrial
    ? gridwiseTemplates(name, company, location, hook, message)
    : genericTemplates(name, company, hook, message);

  return Array.from({ length: count }, (_, i) => ({
    id: `${lead.id ?? "new"}-v${i + 1}`,
    subject: templates[i % templates.length].subject,
    body: templates[i % templates.length].body,
    variation: i + 1
  }));
}

// ── Voice call script builder ────────────────────────────────────────────────

export function buildVoiceScript(lead: LeadRecord, customScript?: string): string {
  if (customScript) return customScript;

  const name = lead.name ?? "";
  const company = lead.company ?? "your organisation";
  const intent = lead.metadata?.intent as LeadIntent | undefined;
  const isIndustrial = intent?.isIndustrial ?? false;

  if (isIndustrial) {
    return [
      name ? `Hello, am I speaking with ${name}?` : "Hello,",
      `This is a brief call from Gridwise, Earthana's industrial re-engineering team based in Chennai.`,
      `We help manufacturing units in Tamil Nadu reduce operational costs by 30 to 35 percent through intelligent factory floor redesign and lean workspace engineering — without disrupting production.`,
      `We would love to offer ${company} a complimentary 20-minute factory floor assessment.`,
      `If that's of interest, please reach us at info at earthana dot in or call 9944670888. Thank you, and have a great day.`
    ].join(" ");
  }

  return [
    name ? `Hello, am I speaking with ${name}?` : "Hello,",
    `This is a quick call from the Earthana team.`,
    `We work with companies like ${company} to build intelligent, outcome-driven workflows.`,
    `We would love to share a tailored idea that fits your current stage. Please reach us at info at earthana dot in. Thank you.`
  ].join(" ");
}
