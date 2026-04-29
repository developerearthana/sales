import { getPendingFollowUps, markFollowUpSent, skipFollowUp } from "./pipelineManager";
import { getLeadState, saveLeadState, createLeadNotification } from "./agentManager";
import { sendEmail } from "./emailClient";
import { sendWhatsAppMessage } from "./whatsappClient";
import { createVoiceCall } from "./voiceClient";
import { initiateRetellCall, isRetellConfigured } from "./retellClient";
import { generateLeadEmail, generateCallScript, isAIConfigured } from "./anthropicClient";

export type FollowUpResult = {
  followUpId: string;
  channel: string;
  status: "sent" | "skipped" | "failed";
  error?: string;
};

export type SchedulerResult = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: FollowUpResult[];
};

export async function processDueFollowUps(limit = 30): Promise<SchedulerResult> {
  const due = await getPendingFollowUps(limit);
  const result: SchedulerResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: [] };

  for (const fu of due) {
    result.processed++;
    let lead: Record<string, any> | null = null;

    try {
      lead = await getLeadState(fu.lead_id).catch(() => null);
    } catch { /* intentionally swallowed */ }

    if (!lead) {
      await skipFollowUp(fu.id).catch(() => {});
      result.skipped++;
      result.details.push({ followUpId: fu.id, channel: fu.channel, status: "skipped", error: "Lead not found" });
      continue;
    }

    // Skip paused / cold leads — don't burn follow-ups on them
    if (lead.automation_paused || lead.interest_status === "cold") {
      await skipFollowUp(fu.id).catch(() => {});
      result.skipped++;
      result.details.push({ followUpId: fu.id, channel: fu.channel, status: "skipped", error: `Lead ${lead.interest_status ?? "paused"}` });
      continue;
    }

    try {
      await executeFollowUp(fu, lead);
      await markFollowUpSent(fu.id);
      result.succeeded++;
      result.details.push({ followUpId: fu.id, channel: fu.channel, status: "sent" });
    } catch (err: any) {
      result.failed++;
      result.details.push({ followUpId: fu.id, channel: fu.channel, status: "failed", error: err?.message });
      console.error(`[scheduler] follow-up ${fu.id} failed:`, err?.message);
    }
  }

  return result;
}

async function executeFollowUp(fu: Record<string, any>, lead: Record<string, any>): Promise<void> {
  switch (fu.channel as string) {
    case "email":     return executeEmailFollowUp(fu, lead);
    case "whatsapp":  return executeWhatsAppFollowUp(fu, lead);
    case "call":      return executeCallFollowUp(fu, lead);
    default: throw new Error(`Unknown follow-up channel: ${fu.channel}`);
  }
}

// ── Email ─────────────────────────────────────────────────────────────────

async function executeEmailFollowUp(fu: Record<string, any>, lead: Record<string, any>): Promise<void> {
  if (!lead.email) throw new Error("No email on lead");

  const intent = (lead.metadata as any)?.intent ?? {};
  let body: string = fu.message ?? "";

  // Re-generate with AI for a fresher, personalised message when scheduled body is too short
  if (isAIConfigured() && body.length < 80) {
    try {
      const generated = await generateLeadEmail({
        name: String(lead.name ?? ""),
        company: String(lead.company ?? ""),
        title: String(lead.title ?? ""),
        industry: String(intent.industry ?? "Manufacturing"),
        location: String(intent.location ?? "Tamil Nadu"),
        intentSignals: intent.intentSignals ?? [],
        style: "direct"
      });
      if (generated) body = generated;
    } catch { /* use scheduled body */ }
  }

  const subject: string = fu.subject ?? `Following up — Gridwise™ | ${lead.company ?? "your facility"}`;
  const html = body.replace(/\n/g, "<br>");

  await sendEmail(lead.email as string, subject, html);

  await saveLeadState({
    id: lead.id,
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await createLeadNotification(lead.id, "follow_up_email", `Follow-up email sent to ${lead.email}`, {
    followUpId: fu.id,
    subject
  });
}

// ── WhatsApp ──────────────────────────────────────────────────────────────

async function executeWhatsAppFollowUp(fu: Record<string, any>, lead: Record<string, any>): Promise<void> {
  const phone = (lead.metadata as any)?.phone as string | undefined;
  if (!phone) throw new Error("No phone on lead metadata");

  const message = String(fu.message ?? `Hi ${lead.name?.split(" ")[0] ?? "there"}, following up from Gridwise™. Any update on the factory floor assessment? info@earthana.in`);

  await sendWhatsAppMessage(phone, message);

  await saveLeadState({
    id: lead.id,
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await createLeadNotification(lead.id, "follow_up_whatsapp", `WhatsApp sent to ${phone}`, { followUpId: fu.id });
}

// ── Call ──────────────────────────────────────────────────────────────────

async function executeCallFollowUp(fu: Record<string, any>, lead: Record<string, any>): Promise<void> {
  const phone = (lead.metadata as any)?.phone as string | undefined;
  if (!phone) throw new Error("No phone on lead metadata");

  const intent = (lead.metadata as any)?.intent ?? {};

  if (isRetellConfigured()) {
    const firstName = String(lead.name ?? "").split(" ")[0] || "there";
    const result = await initiateRetellCall({
      toNumber: phone,
      leadContext: {
        firstName,
        company: String(lead.company ?? "your company"),
        industry: String(intent.industry ?? "Manufacturing"),
        location: String(intent.location ?? "Tamil Nadu"),
        leadId: lead.id
      }
    });

    await saveLeadState({
      id: lead.id,
      interest_status: "call_scheduled",
      last_contacted: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { ...(lead.metadata as Record<string, unknown> | undefined), lastRetellCallId: result.callId }
    });

    await createLeadNotification(lead.id, "follow_up_call", `Retell AI call initiated to ${phone}`, {
      followUpId: fu.id,
      callId: result.callId,
      engine: "retell"
    });
    return;
  }

  // Twilio fallback
  const script = isAIConfigured()
    ? await generateCallScript({
        name: String(lead.name ?? ""),
        company: String(lead.company ?? ""),
        industry: String(intent.industry ?? "Manufacturing"),
        isIndustrial: intent.isIndustrial,
        location: String(intent.location ?? "Tamil Nadu")
      })
    : String(fu.message ?? "Hello, this is a follow-up from Gridwise™. We hope to connect soon about your factory floor assessment.");

  const call = await createVoiceCall(phone, { script });

  await saveLeadState({
    id: lead.id,
    interest_status: "call_scheduled",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: { ...(lead.metadata as Record<string, unknown> | undefined), lastCallSid: call.callSid }
  });

  await createLeadNotification(lead.id, "follow_up_call", `Twilio call initiated to ${phone}`, {
    followUpId: fu.id,
    callSid: call.callSid,
    engine: "twilio"
  });
}
