import { researchAgent } from "../api/agents/research";
import { outboundAgent } from "../api/agents/outbound";
import { engagementAgent } from "../api/agents/engagement";
import { voiceAgent } from "../api/agents/voice";

const agentHandlers: Record<string, (payload: unknown) => Promise<unknown>> = {
  researcher: researchAgent,
  outbound: outboundAgent,
  engagement: engagementAgent,
  voice: voiceAgent
};

export async function callAgent(agentName: string, payload: unknown) {
  const handler = agentHandlers[agentName];
  if (!handler) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const data = await handler(payload);
  return { agent: agentName, data };
}
