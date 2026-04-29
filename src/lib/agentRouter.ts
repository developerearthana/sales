import researchHandler from "../api/agents/research";
import outboundHandler from "../api/agents/outbound";
import engagementHandler from "../api/agents/engagement";
import voiceHandler from "../api/agents/voice";

const agentHandlers: Record<string, (req: Request) => Promise<Response>> = {
  researcher: researchHandler,
  outbound: outboundHandler,
  engagement: engagementHandler,
  voice: voiceHandler
};

export async function callAgent(agentName: string, payload: unknown) {
  const handler = agentHandlers[agentName];
  if (!handler) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const request = new Request(`https://agent.local/${agentName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const response = await handler(request);
  const data = await response.json();
  return { agent: agentName, data };
}
