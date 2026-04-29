export type LeadIntent = {
  industry: string;
  seniority: string;
  location: string;
  intentSignals: string[];
  hook: string;
  confidence: number;
  rawQuery: string;
};

const industryPatterns: Array<[RegExp, string]> = [
  [/saas|software|startup|tech/i, "SaaS / Technology"],
  [/fintech/i, "Fintech"],
  [/healthcare|health tech/i, "Healthcare"],
  [/ecommerce|e-?commerce/i, "Ecommerce"],
  [/ai|artificial intelligence/i, "AI / Automation"],
  [/marketing|martech/i, "Marketing"],
  [/sales|crm/i, "Sales / CRM"]
];

const seniorityPatterns: Array<[RegExp, string]> = [
  [/(founder|co-founder|ceo|cto|cxo|chief)/i, "Founder / C-suite"],
  [/(head of|vp|vice president|director)/i, "Director / VP"],
  [/(manager|lead)/i, "Manager / Lead"],
  [/(engineer|developer|designer)/i, "Individual Contributor"]
];

const locationPatterns: Array<[RegExp, string]> = [
  [/(united states|usa|us|america)/i, "United States"],
  [/(canada)/i, "Canada"],
  [/(europe|uk|united kingdom|london)/i, "Europe"],
  [/(india)/i, "India"],
  [/remote/i, "Remote"],
  [/global/i, "Global"]
];

const intentSignalsPatterns: Array<[RegExp, string]> = [
  [/funding|seed|series [a-z]/i, "Recent funding"],
  [/launch|beta|v1|mvp/i, "Early stage"],
  [/grow|scale|expansion/i, "Scaling"],
  [/hiring|team|recruiting/i, "Growth signals"],
  [/acquisition|exit|m&a/i, "M&A signals"]
];

function matchFirst(patterns: Array<[RegExp, string]>, text: string, fallback: string) {
  const match = patterns.find(([pattern]) => pattern.test(text));
  return match ? match[1] : fallback;
}

export function parseLeadIntent(query: string): LeadIntent {
  const rawQuery = query.trim();
  const industry = matchFirst(industryPatterns, rawQuery, "Technology");
  const seniority = matchFirst(seniorityPatterns, rawQuery, "Founder");
  const location = matchFirst(locationPatterns, rawQuery, "Global");
  const intentSignals = intentSignalsPatterns
    .filter(([pattern]) => pattern.test(rawQuery))
    .map(([, label]) => label);
  const hook = rawQuery.replace(/^(find|need|looking for)\s*/i, "").slice(0, 120);
  const confidence = Math.min(1, 0.2 + (intentSignals.length * 0.2) + (industry !== "Technology" ? 0.1 : 0.05));

  return {
    industry,
    seniority,
    location,
    intentSignals,
    hook,
    confidence,
    rawQuery
  };
}
