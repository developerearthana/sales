export type LeadIntent = {
  industry: string;
  seniority: string;
  location: string;
  intentSignals: string[];
  hook: string;
  confidence: number;
  rawQuery: string;
  isIndustrial: boolean;
  gridwiseScore: number;
};

const industryPatterns: Array<[RegExp, string]> = [
  [/manufacturing|factory|plant|industrial park|msme|micro.?small|medium enterprise/i, "Manufacturing / Industrial"],
  [/automotive|auto component|vehicle|two.?wheel|four.?wheel/i, "Automotive"],
  [/lean|net.?zero|sustainability|green factory|biophilic|carbon.?neutral/i, "Sustainability / Lean"],
  [/textile|garment|apparel|spinning|weaving/i, "Textile / Garment"],
  [/pharma|pharmaceutical|life.?science|medical device/i, "Pharma / Medical"],
  [/food.?proc|agro|processing|cold.?chain/i, "Food Processing / Agro"],
  [/saas|software|startup|tech/i, "SaaS / Technology"],
  [/fintech/i, "Fintech"],
  [/healthcare|health tech/i, "Healthcare"],
  [/ecommerce|e-?commerce/i, "Ecommerce"],
  [/ai|artificial intelligence/i, "AI / Automation"],
  [/real.?estate|industrial park|warehouse|logistics/i, "Industrial Real Estate"]
];

const seniorityPatterns: Array<[RegExp, string]> = [
  [/(plant director|plant head|factory head)/i, "Plant Director"],
  [/(founder|co-?founder|ceo|cto|cxo|managing director|md)/i, "Founder / MD"],
  [/(operations head|head of operations|coo)/i, "Operations Head / COO"],
  [/(facility manager|facilities head|estate manager)/i, "Facility Manager"],
  [/(sustainability officer|green officer|environment head)/i, "Sustainability Officer"],
  [/(quality head|compliance manager|quality manager)/i, "Quality / Compliance Manager"],
  [/(head of|vp|vice president|director)/i, "Director / VP"],
  [/(manager|lead)/i, "Manager / Lead"],
  [/(engineer|developer|designer)/i, "Individual Contributor"]
];

const locationPatterns: Array<[RegExp, string]> = [
  [/chennai|saidapet|little.?mount|t\.nagar|ambattur|guindy|perungudi|OMR/i, "Chennai, Tamil Nadu"],
  [/coimbatore|cbe/i, "Coimbatore, Tamil Nadu"],
  [/sipcot|oragadam|sriperumbudur|mahindra.?world.?city/i, "Industrial Park, Tamil Nadu"],
  [/madurai|trichy|tiruchirappalli|salem|tirunelveli/i, "Tamil Nadu (Interior)"],
  [/tamil.?nadu|tn/i, "Tamil Nadu"],
  [/bangalore|bengaluru/i, "Bangalore, Karnataka"],
  [/pune|pimpri|chinchwad/i, "Pune, Maharashtra"],
  [/united states|usa|us\b|america/i, "United States"],
  [/canada/i, "Canada"],
  [/europe|uk|united kingdom|london/i, "Europe"],
  [/india/i, "India"],
  [/remote/i, "Remote"],
  [/global/i, "Global"]
];

const intentSignalPatterns: Array<[RegExp, string]> = [
  [/lean.?manufactur|lean.?production|lean.?layout/i, "Lean manufacturing initiative"],
  [/net.?zero|carbon.?neutral|sustainability.?grant|green.?cert/i, "Net Zero / Sustainability target"],
  [/factory.?renovat|plant.?upgrade|facility.?moderniz|re.?engineer/i, "Factory modernisation project"],
  [/iso.*certif|osha|export.?ready|quality.?audit/i, "Export / Compliance certification"],
  [/new.?plant|greenfield|expansion|new.?unit/i, "New plant / Expansion"],
  [/msme.*grant|make.?in.?india|atma.?nirbhar/i, "Govt scheme / MSME grant"],
  [/landscape|green.?campus|biophilic|industrial.?garden/i, "Industrial landscaping"],
  [/energy.?efficien|solar|power.?cost|electricity.?bill/i, "Energy efficiency"],
  [/funding|seed|series [a-z]/i, "Recent funding"],
  [/launch|beta|v1|mvp/i, "Early stage"],
  [/grow|scale|expansion/i, "Scaling"],
  [/hiring|team|recruiting/i, "Growth signals"],
  [/acquisition|exit|m&a/i, "M&A signals"]
];

const industrialKeywords = /manufactur|factory|plant|msme|industrial|lean|automotive|textile|pharma|food.proc|facility|workshop|floor.?layout|production.?line/i;

function matchFirst(patterns: Array<[RegExp, string]>, text: string, fallback: string): string {
  const match = patterns.find(([re]) => re.test(text));
  return match ? match[1] : fallback;
}

function matchAll(patterns: Array<[RegExp, string]>, text: string): string[] {
  return patterns.filter(([re]) => re.test(text)).map(([, label]) => label);
}

export function parseLeadIntent(query: string): LeadIntent {
  const rawQuery = query.trim();
  const industry = matchFirst(industryPatterns, rawQuery, "Technology");
  const seniority = matchFirst(seniorityPatterns, rawQuery, "Founder");
  const location = matchFirst(locationPatterns, rawQuery, "Tamil Nadu");
  const intentSignals = matchAll(intentSignalPatterns, rawQuery);
  const hook = rawQuery.replace(/^(find|need|looking.?for|identify|get)\s*/i, "").slice(0, 140);

  const isIndustrial = industrialKeywords.test(rawQuery);
  const gridwiseScore = Math.min(1,
    (isIndustrial ? 0.3 : 0) +
    (intentSignals.some(s => s.includes("Lean") || s.includes("Factory") || s.includes("Net Zero")) ? 0.25 : 0) +
    (/chennai|coimbatore|sipcot|oragadam|tamil/i.test(rawQuery) ? 0.2 : 0) +
    (intentSignals.length * 0.05)
  );
  const confidence = Math.min(1, Math.round((
    0.2 +
    (intentSignals.length * 0.12) +
    (industry !== "Technology" ? 0.1 : 0.05) +
    (isIndustrial ? 0.1 : 0)
  ) * 100) / 100);

  return {
    industry,
    seniority,
    location,
    intentSignals,
    hook,
    confidence,
    rawQuery,
    isIndustrial,
    gridwiseScore
  };
}
