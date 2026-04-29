import { getLeadState, saveLeadState, createLeadNotification } from "../../lib/agentManager";
import { fetchCrmLeadByEmail, upsertCrmLead } from "../../lib/crmClient";
import { sendEmail } from "../../lib/emailClient";
import { generateLeadEmail, generateCallScript, isAIConfigured, type EmailStyle } from "../../lib/anthropicClient";
import { createDeal, scheduleFollowUp, daysFromNow } from "../../lib/pipelineManager";
import { detectHumanInLoopSignals } from "../../lib/copywriter";

// Style selection from lead metadata
function selectEmailStyle(lead: Record<string, any>): EmailStyle {
  const meta = (lead.metadata ?? {}) as Record<string, any>;
  const intent = meta.intent ?? {};
  const signals: string[] = intent.signals ?? [];
  if (signals.some((s: string) => /net.?zero|green|sustainab|iso.?14001/i.test(s))) return "sustainability";
  if (signals.some((s: string) => /export|certification|iso|lean/i.test(s))) return "export";
  if (signals.some((s: string) => /absentee|wellbeing|workforce|biophil/i.test(s))) return "wellbeing";
  if (meta.isIndustrial && (intent.gridwiseScore ?? 0) >= 70) return "efficiency";
  return "direct";
}

export async function outboundAgent(body: unknown) {
  const parsed = body as { leadId: string; style?: EmailStyle; hook?: string };
  const { leadId, hook } = parsed;
  if (!leadId) throw new Error("Missing leadId");

  const lead = await getLeadState(leadId);
  if (!lead?.email) throw new Error("Lead not found or missing email");

  const intent = (lead.metadata as any)?.intent ?? {};
  const style: EmailStyle = parsed.style ?? selectEmailStyle(lead);

  // Check if this should be flagged for human review
  const reviewSignal = detectHumanInLoopSignals(hook ?? "", lead as any);
  if (reviewSignal.requiresReview) {
    await saveLeadState({
      id: leadId,
      human_review_required: true,
      review_reason: reviewSignal.reason,
      automation_paused: true,
      updated_at: new Date().toISOString()
    });
    return {
      status: "flagged_for_review",
      leadId,
      reason: reviewSignal.reason
    };
  }

  // Generate AI personalized email
  let emailBody: string;
  if (isAIConfigured()) {
    const generated = await generateLeadEmail({
      name: String(lead.name ?? ""),
      company: String(lead.company ?? ""),
      title: String(lead.title ?? ""),
      industry: String(intent.industry ?? "Manufacturing"),
      location: String(intent.location ?? "Tamil Nadu"),
      intentSignals: intent.intentSignals ?? [],
      hook: hook ?? intent.hook,
      style
    });
    emailBody = generated ?? fallbackEmail(lead);
  } else {
    emailBody = fallbackEmail(lead);
  }

  const subject = `Gridwise™ | Factory re-engineering for ${lead.company ?? "your facility"}`;

  // Send email (best-effort)
  let emailSent = false;
  let emailError: string | undefined;
  try {
    await sendEmail(lead.email as string, subject, emailBody.replace(/\n/g, "<br>"));
    emailSent = true;
  } catch (err: any) {
    emailError = err?.message ?? "Email send failed";
    console.warn("[outbound] Email send failed:", emailError);
  }

  // Sync to CRM
  try {
    const existing = await fetchCrmLeadByEmail(lead.email as string);
    if (!existing) {
      await upsertCrmLead({
        id: leadId,
        email: lead.email,
        name: lead.name,
        company: lead.company,
        title: lead.title,
        status: "outreach"
      });
    }
  } catch {
    // CRM sync is non-blocking
  }

  // Create deal record if not already in pipeline
  let dealId: string | undefined;
  try {
    const deal = await createDeal({
      leadId,
      stage: "contacted",
      owner: "Gridwise™ Team",
      notes: `Initial outreach via ${style} email`
    });
    dealId = deal.id;
  } catch {
    // Deal creation is non-blocking
  }

  // Schedule 3 follow-up emails (7, 14, 21 days)
  const followupMessages = [
    { days: 7,  subject: `Following up — Gridwise™ factory floor assessment`,
      message: `Quick follow-up on my previous email. We're scheduling complimentary factory floor assessments in ${intent.location ?? "Tamil Nadu"} this month. Would a 20-min call work for you?` },
    { days: 14, subject: `Have you seen our MSME case study? — Gridwise™`,
      message: `Our recent work in Ambattur reduced a 200-person plant's energy costs by 28% in 60 days. Happy to share the full case study — just reply "send case study".` },
    { days: 21, subject: `Last note from Gridwise™ — closing this thread`,
      message: `I'll stop reaching out after this. If factory re-engineering ever becomes a priority for ${lead.company ?? "your team"}, reach us at info@earthana.in or +91 99446 70888.` }
  ];

  for (const fu of followupMessages) {
    try {
      await scheduleFollowUp({
        leadId,
        dealId,
        channel: "email",
        subject: fu.subject,
        message: fu.message,
        scheduledAt: daysFromNow(fu.days)
      });
    } catch {
      // Schedule failures are non-blocking
    }
  }

  // Schedule WhatsApp follow-up on day 3 if AI available
  if (isAIConfigured()) {
    try {
      const waScript = await generateCallScript({
        name: String(lead.name ?? ""),
        company: String(lead.company ?? ""),
        industry: String(intent.industry ?? "Manufacturing"),
        isIndustrial: intent.isIndustrial,
        location: String(intent.location ?? "Tamil Nadu")
      });
      await scheduleFollowUp({
        leadId,
        dealId,
        channel: "whatsapp",
        message: waScript,
        scheduledAt: daysFromNow(3)
      });
    } catch {
      // Non-blocking
    }
  }

  // Update lead status
  await saveLeadState({
    id: leadId,
    interest_status: "outreach_sent",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(lead.metadata as Record<string, unknown> | undefined),
      lastEmailStyle: style,
      lastEmailSubject: subject,
      dealId
    }
  });

  await createLeadNotification(leadId, "outbound_email", `Email sent to ${lead.email}: "${subject}"`, {
    style,
    emailSent,
    dealId,
    followUpsScheduled: 4
  });

  return {
    status: emailSent ? "outbound_triggered" : "outbound_queued",
    leadId,
    subject,
    style,
    dealId,
    followUpsScheduled: 4,
    ...(emailError && { warning: emailError })
  };
}

function fallbackEmail(lead: Record<string, any>): string {
  const name = String(lead.name ?? "").split(" ")[0] || "there";
  const company = String(lead.company ?? "your facility");
  return `Hi ${name},\n\nGridwise™ helps manufacturing plants in Tamil Nadu cut operational costs by 30-35% through intelligent factory floor redesign — without stopping production.\n\nI'd love to offer ${company} a complimentary 30-minute floor assessment.\n\nWould a quick call this week work?\n\nGridwise™ Team | Earthana (EESPL) | info@earthana.in | +91 99446 70888`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);
  try {
    const result = await outboundAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const msg = error?.message ?? "Invalid request";
    return res.status(msg === "Lead not found or missing email" ? 404 : 400).json({ error: msg });
  }
}
