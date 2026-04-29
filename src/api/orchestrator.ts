import { callAgent } from "../lib/agentRouter";
import { saveLeadState } from "../lib/agentManager";

export async function runOrchestrator(body: unknown) {
  const { agent, lead } = body as { agent: string; lead: Record<string, unknown> };

  if (!agent || !lead?.id) {
    throw new Error("Missing agent or lead.id");
  }

  await saveLeadState({ ...lead, updated_at: new Date().toISOString() });
  const result = await callAgent(agent, lead);

  return { status: "routed", result };
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
