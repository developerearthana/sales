import { getLeadState, saveLeadState, createLeadNotification } from "../../lib/agentManager";
import { createVoiceCall, getCallStatus, listRecentCalls, cancelCall } from "../../lib/voiceClient";
import { initiateRetellCall, getRetellCallDetails, isRetellConfigured } from "../../lib/retellClient";
import { generateCallScript, isAIConfigured } from "../../lib/anthropicClient";
import { buildVoiceScript } from "../../lib/copywriter";

export async function voiceAgent(body: unknown) {
  const payload = body as { leadId: string; script?: string; callbackUrl?: string };
  const { leadId, callbackUrl } = payload;
  if (!leadId) throw new Error("Missing leadId");

  const lead = await getLeadState(leadId);
  if (!lead) throw new Error("Lead not found");

  const phone = (lead.metadata as any)?.phone as string | undefined;
  if (!phone) throw new Error("No phone number for lead — set metadata.phone first.");

  const intent = (lead.metadata as any)?.intent ?? {};

  // ── Retell AI (conversational, preferred) ─────────────────────────────────
  if (isRetellConfigured()) {
    const firstName = String(lead.name ?? "").split(" ")[0] || "there";
    const result = await initiateRetellCall({
      toNumber: phone,
      leadContext: {
        firstName,
        company: String(lead.company ?? "your company"),
        industry: String(intent.industry ?? "Manufacturing"),
        location: String(intent.location ?? "Tamil Nadu"),
        leadId
      }
    });

    await saveLeadState({
      id: leadId,
      interest_status: "call_scheduled",
      last_contacted: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...(lead.metadata as Record<string, unknown> | undefined),
        lastCallId: result.callId,
        lastCallEngine: "retell"
      }
    });

    await createLeadNotification(leadId, "voice_call", `Retell AI call initiated to ${phone}`, {
      callId: result.callId,
      engine: "retell"
    });

    return {
      status: "voice_call_triggered",
      leadId,
      phone,
      callId: result.callId,
      engine: "retell"
    };
  }

  // ── Twilio TTS fallback ───────────────────────────────────────────────────
  const callScript = isAIConfigured()
    ? await generateCallScript({
        name: String(lead.name ?? ""),
        company: String(lead.company ?? ""),
        industry: String(intent.industry ?? "Manufacturing"),
        isIndustrial: intent.isIndustrial,
        location: String(intent.location ?? "Tamil Nadu")
      })
    : buildVoiceScript(lead as any, payload.script);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const statusCb = callbackUrl ?? (baseUrl ? `${baseUrl}/api/webhook/twilio?leadId=${leadId}` : undefined);

  const call = await createVoiceCall(phone, { script: callScript, callbackUrl: statusCb });

  await saveLeadState({
    id: leadId,
    interest_status: "call_scheduled",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(lead.metadata as Record<string, unknown> | undefined),
      lastCallSid: call.callSid,
      lastCallEngine: "twilio"
    }
  });

  await createLeadNotification(leadId, "voice_call", `Twilio call initiated to ${phone}`, {
    callSid: call.callSid,
    engine: "twilio"
  });

  return {
    status: "voice_call_triggered",
    leadId,
    phone,
    callSid: call.callSid,
    engine: "twilio"
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const calls = await listRecentCalls(20);
      return res.status(200).json({ calls });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message ?? "Failed to list calls" });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);

  const action = body?.action;

  if (action === "status") {
    try {
      // Try Retell first, then Twilio
      if (body.callId) {
        const details = await getRetellCallDetails(body.callId);
        return res.status(200).json(details ?? { error: "Call not found" });
      }
      if (body.callSid) {
        const status = await getCallStatus(body.callSid);
        return res.status(200).json(status);
      }
      return res.status(400).json({ error: "Provide callId or callSid" });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message });
    }
  }

  if (action === "cancel" && body?.callSid) {
    try {
      const result = await cancelCall(body.callSid);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err?.message });
    }
  }

  try {
    const result = await voiceAgent(body);
    return res.status(200).json(result);
  } catch (err: any) {
    const msg = err?.message ?? "Invalid request";
    return res.status(msg.includes("not found") ? 404 : 400).json({ error: msg });
  }
}
