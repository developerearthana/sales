import { researchAgent } from "../api/agents/research";
import { outboundAgent } from "../api/agents/outbound";
import { engagementAgent } from "../api/agents/engagement";
import { voiceAgent } from "../api/agents/voice";
import { leadScoutAgent } from "../api/agents/leadScout";
import { closerAgent } from "../api/agents/closer";

const agentHandlers: Record<string, (payload: unknown) => Promise<unknown>> = {
  researcher: researchAgent,
  leadScout: leadScoutAgent,
  outbound: outboundAgent,
  engagement: engagementAgent,
  voice: voiceAgent,
  closer: closerAgent
};

export async function callAgent(agentName: string, payload: unknown) {
  const handler = agentHandlers[agentName];
  if (!handler) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const data = await handler(payload);
  return { agent: agentName, data };
}
