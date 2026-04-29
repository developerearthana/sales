import { getLeadState, saveLeadState, createLeadNotification } from "../../lib/agentManager";
import { createVoiceCall, getCallStatus, listRecentCalls, cancelCall } from "../../lib/voiceClient";
import { buildVoiceScript } from "../../lib/copywriter";

export async function voiceAgent(body: unknown) {
  const payload = body as { leadId: string; script?: string; callbackUrl?: string };
  const { leadId, script, callbackUrl } = payload;

  if (!leadId) throw new Error("Missing leadId");

  const lead = await getLeadState(leadId);
  if (!lead) throw new Error("Lead not found");

  const phone = (lead.metadata as any)?.phone ?? "";
  if (!phone) throw new Error("No phone number available for lead. Add metadata.phone.");

  const callScript = buildVoiceScript(lead as any, script);
  const callResult = await createVoiceCall(phone, {
    script: callScript,
    callbackUrl,
    metadata: { leadId, name: lead.name, company: lead.company }
  });

  await saveLeadState({
    id: leadId,
    interest_status: "call_scheduled",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(lead.metadata as Record<string, unknown> | undefined),
      lastCallSid: callResult.callSid,
      lastCallStatus: callResult.status
    }
  });

  await createLeadNotification(leadId, "voice_call", `Voice call initiated to ${phone}`, {
    callSid: callResult.callSid,
    status: callResult.status
  });

  return {
    status: "voice_call_triggered",
    leadId,
    phone,
    callSid: callResult.callSid,
    callStatus: callResult.status
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const calls = await listRecentCalls(20);
      return res.status(200).json({ calls });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message ?? "Failed to list calls" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);

  // Call management actions
  const action = body?.action;
  if (action === "status" && body?.callSid) {
    try {
      const status = await getCallStatus(body.callSid);
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message });
    }
  }
  if (action === "cancel" && body?.callSid) {
    try {
      const result = await cancelCall(body.callSid);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message });
    }
  }

  try {
    const result = await voiceAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const msg = error?.message ?? "Invalid request";
    return res.status(msg === "Lead not found" ? 404 : 400).json({ error: msg });
  }
}
