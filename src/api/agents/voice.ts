import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { createVoiceCall } from "../../lib/voiceClient";

export async function voiceAgent(body: unknown) {
  const payload = body as { leadId: string; script?: string };
  const { leadId, script } = payload;

  if (!leadId) {
    throw new Error("Missing leadId");
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const phone = (lead.metadata as any)?.phone ?? "";
  if (!phone) {
    throw new Error("No phone number available for voice call");
  }

  const callPayload = {
    leadId,
    script: script ?? `Hello ${lead.name ?? "there"}, I wanted to share a quick idea for ${lead.company}.`,
    metadata: { name: lead.name, company: lead.company }
  };

  await createVoiceCall(phone, callPayload);
  await saveLeadState({
    id: leadId,
    interest_status: "call_scheduled",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return { status: "voice_call_triggered", leadId, phone };
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
    const result = await voiceAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message ?? "Invalid request";
    return res.status(message === "Lead not found" ? 404 : 400).json({ error: message });
  }
}
