import { callAgent } from "../lib/agentRouter";
import { saveLeadState } from "../lib/agentManager";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { agent, lead } = body as { agent: string; lead: Record<string, unknown> };

  if (!agent || !lead?.id) {
    return new Response(JSON.stringify({ error: "Missing agent or lead.id" }), { status: 400 });
  }

  await saveLeadState({ ...lead, updated_at: new Date().toISOString() });
  const result = await callAgent(agent, lead);

  return new Response(JSON.stringify({ status: "routed", result }), {
    headers: { "Content-Type": "application/json" }
  });
}
