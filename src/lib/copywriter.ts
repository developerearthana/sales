export type LeadRecord = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

const humanReviewTriggers = [/(price|pricing|cost|budget|investment)/i, /(integration|api|connect|connects)/i];

export function detectHumanInLoopSignals(text: string, lead?: LeadRecord) {
  const combined = [text, lead?.metadata?.hook, lead?.metadata?.notes].filter(Boolean).join(" ");
  const matches = humanReviewTriggers.filter((pattern) => pattern.test(combined));
  return {
    requiresReview: matches.length > 0,
    reason: matches.length > 0 ? `Detected ${matches.map((r) => r.source).join(" and ")}` : "No human-review flags detected"
  };
}

export function generateEmailVariations(
  lead: LeadRecord,
  hook: string,
  baseMessage?: string,
  count = 5
) {
  const name = lead.name ?? "there";
  const company = lead.company ?? "your team";
  const firstSentence = hook ? `I saw your recent post about ${hook}.` : `I saw your work at ${company}.`;
  const templates = [
    `${firstSentence} I wanted to share a precise idea for ${company} that fits your current stage.

${baseMessage ?? "Here is one way to make your next outreach more personal and measurable."}`,
    `${firstSentence} This is a short note because your current focus on ${company} stood out to me.

${baseMessage ?? "I can help craft a follow-up sequence that feels authentic and human."}`,
    `${firstSentence} I know it can be hard to cut through noise, especially when price or integration is top of mind.

${baseMessage ?? "Let me suggest a version that stays specific without sounding salesy."}`,
    `${firstSentence} If ${company} is still evaluating new tools, this quick idea should feel relevant.

${baseMessage ?? "I’d love to share a two-line use case tailored to your team."}`,
    `${firstSentence} Most founders I speak with want a no-nonsense introduction, so I kept this short.

${baseMessage ?? "Tell me if you want a version that leans into case studies or product fit."}`
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `${lead.id ?? "new"}-${index + 1}`,
    subject: `A quick idea for ${lead.company ?? "your team"}`,
    body: templates[index % templates.length],
    variation: index + 1
  }));
}
