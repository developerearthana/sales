import { config } from "./config";

const RETELL_BASE = "https://api.retellai.com";

// Gridwise™ conversational AI persona prompt
const GRIDWISE_AGENT_PROMPT = `You are Priya, outreach specialist for Gridwise™ by Earthana EESPL, calling from Chennai.

Gridwise™ helps Tamil Nadu manufacturers cut operational costs by 30–35% through intelligent factory floor redesign without stopping production.

Key services:
• Floor layout redesign — 30–35% cost reduction
• Lean manufacturing + ISO certification in 90 days
• Biophilic industrial landscaping — 18–22% absenteeism reduction
• Energy re-engineering — 28% average energy savings
• Net Zero + Green Certification (ISO 14001, LEED Industrial)

You are calling {{first_name}} at {{company}}, a {{industry}} company in {{location}}.
Objective: Offer a complimentary 30-minute factory floor assessment or a 20-minute discovery call.

Call flow:
1. Greet by name, introduce yourself and Gridwise™ in one sentence.
2. Ask one specific, relevant question about their factory floor or operations.
3. If they engage: briefly share the most relevant benefit, offer the free assessment.
4. If they ask questions: answer factually from Gridwise™ knowledge. Offer info@earthana.in.
5. If busy: "No problem — what's the best time to call back?"
6. If not interested: "Understood, thank you for your time. If factory re-engineering ever comes up, we are at info@earthana.in."

Voice style: conversational, warm, professional, not scripted. Natural pauses. Never pushy.`;

let _cachedAgentId: string | null = null;

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.retellApiKey}`
  };
}

async function retellPost(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${RETELL_BASE}/${endpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Retell ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Agent provisioning ─────────────────────────────────────────────────────

export async function provisionGridwiseAgent(): Promise<string> {
  // 1. Use pre-configured agent ID if available
  if (config.retellAgentId) {
    _cachedAgentId = config.retellAgentId;
    return _cachedAgentId;
  }
  if (_cachedAgentId) return _cachedAgentId;

  // 2. Create Retell LLM with Gridwise™ prompt
  const llm = await retellPost("create-retell-llm", {
    model: "claude-3-5-sonnet",
    general_prompt: GRIDWISE_AGENT_PROMPT,
    begin_message:
      "Hello, may I speak with {{first_name}}? This is Priya calling from Gridwise™ — we help manufacturers in Tamil Nadu reduce factory costs. Do you have two minutes?",
    general_tools: []
  });

  // 3. Create Agent linked to that LLM
  const agent = await retellPost("create-agent", {
    response_engine: { type: "retell-llm", llm_id: llm.llm_id },
    agent_name: "Gridwise™ Priya",
    voice_id: "eleven_labs-Andrea",
    language: "en",
    voice_speed: 1.05,
    responsiveness: 0.9,
    interruption_sensitivity: 0.8,
    enable_backchannel: true,
    backchannel_frequency: 0.6
  });

  _cachedAgentId = agent.agent_id as string;
  return _cachedAgentId;
}

// ── Call management ────────────────────────────────────────────────────────

export type RetellCallResult = {
  callId: string;
  status: string;
};

export async function initiateRetellCall(params: {
  toNumber: string;
  leadContext: {
    firstName: string;
    company: string;
    industry: string;
    location: string;
    leadId: string;
  };
}): Promise<RetellCallResult> {
  if (!config.retellPhoneFrom) {
    throw new Error("RETELL_PHONE_FROM is not configured. Add a Retell-registered number.");
  }

  const agentId = await provisionGridwiseAgent();
  const data = await retellPost("v2/create-phone-call", {
    from_number: config.retellPhoneFrom,
    to_number: params.toNumber,
    override_agent_id: agentId,
    metadata: { leadId: params.leadContext.leadId },
    retell_llm_dynamic_variables: {
      first_name: params.leadContext.firstName,
      company: params.leadContext.company,
      industry: params.leadContext.industry,
      location: params.leadContext.location
    }
  });

  return { callId: data.call_id as string, status: (data.status ?? "created") as string };
}

export async function getRetellCallDetails(callId: string): Promise<{
  callId: string;
  status: string;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  recordingUrl?: string;
  startTimestamp?: number;
  endTimestamp?: number;
} | null> {
  if (!config.retellApiKey) return null;
  try {
    const res = await fetch(`${RETELL_BASE}/v2/get-call/${callId}`, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      callId: data.call_id,
      status: data.call_status,
      transcript: data.transcript,
      summary: data.call_analysis?.call_summary,
      sentiment: data.call_analysis?.user_sentiment,
      recordingUrl: data.recording_url,
      startTimestamp: data.start_timestamp,
      endTimestamp: data.end_timestamp
    };
  } catch {
    return null;
  }
}

export async function listRetellCalls(limit = 20): Promise<Array<{
  callId: string;
  toNumber: string;
  status: string;
  startTimestamp?: number;
  endTimestamp?: number;
  transcript?: string;
}>> {
  if (!config.retellApiKey) return [];
  try {
    const res = await fetch(`${RETELL_BASE}/v2/list-calls?limit=${limit}`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.calls ?? data ?? []).map((c: any) => ({
      callId: c.call_id,
      toNumber: c.to_number,
      status: c.call_status,
      startTimestamp: c.start_timestamp,
      endTimestamp: c.end_timestamp,
      transcript: c.transcript
    }));
  } catch {
    return [];
  }
}

export function isRetellConfigured(): boolean {
  return !!config.retellApiKey && !!config.retellPhoneFrom;
}
