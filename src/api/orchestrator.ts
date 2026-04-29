import { callAgent } from "../lib/agentRouter";
import { saveLeadState } from "../lib/agentManager";

export type OrchestratorPayload = {
  agent: string;
  lead?: Record<string, unknown>;
  payload?: unknown;
};

export async function runOrchestrator(body: OrchestratorPayload) {
  const { agent, lead, payload } = body;

  if (!agent) {
    throw new Error("Missing agent");
  }

  const input = payload ?? lead ?? body;
  if (!input) {
    throw new Error("Missing payload for agent routing");
  }

  if (lead?.id) {
    await saveLeadState({ ...lead, updated_at: new Date().toISOString() });
  }

  const result = await callAgent(agent, input);
  return { status: "routed", resource: agent, result };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  try {
    const result = await runOrchestrator(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
