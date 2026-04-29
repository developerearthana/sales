import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { createVoiceCall } from "../../lib/voiceClient";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { leadId, script } = body as { leadId: string; script?: string };

  if (!leadId) {
    return new Response(JSON.stringify({ error: "Missing leadId" }), { status: 400 });
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
  }

  const phone = (lead.metadata as any)?.phone ?? "";
  if (!phone) {
    return new Response(JSON.stringify({ error: "No phone number available for voice call" }), { status: 400 });
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

  return new Response(JSON.stringify({ status: "voice_call_triggered", leadId, phone }), {
    headers: { "Content-Type": "application/json" }
  });
}
