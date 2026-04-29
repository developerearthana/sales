import { getLeadState, flagHumanReview, saveLeadState } from "../../lib/agentManager";
import { detectHumanInLoopSignals, generateEmailVariations } from "../../lib/copywriter";
import { generateLeadEmail, isAIConfigured, type EmailStyle } from "../../lib/anthropicClient";

export type CloserPayload = { leadId: string; hook?: string; notes?: string };

const ALL_STYLES: EmailStyle[] = ["efficiency", "sustainability", "export", "direct", "wellbeing"];

const STYLE_LABELS: Record<EmailStyle, string> = {
  efficiency: "Cost Reduction Angle",
  sustainability: "Net Zero / Green",
  export: "Export Readiness",
  direct: "Short & Direct",
  wellbeing: "Biophilic / Wellbeing"
};

export async function closerAgent(body: unknown) {
  const payload = body as CloserPayload;
  const { leadId, hook, notes } = payload;
  if (!leadId) throw new Error("Missing leadId");

  const lead = await getLeadState(leadId);
  if (!lead) throw new Error("Lead not found");

  const reviewSignal = detectHumanInLoopSignals(notes ?? String(hook ?? ""), lead as any);
  if (reviewSignal.requiresReview) {
    await flagHumanReview(leadId, reviewSignal.reason, "pause_outreach", "copy-review-team");
  }

  const intent = (lead.metadata as any)?.intent ?? {};

  let variations: Array<{ id: string; style: EmailStyle; label: string; subject: string; body: string; variation: number }>;

  if (isAIConfigured()) {
    // Generate 5 real AI-powered email variants using Claude
    const generated = await Promise.all(
      ALL_STYLES.map(async (style, i) => {
        try {
          const text = await generateLeadEmail({
            name: String(lead.name ?? ""),
            company: String(lead.company ?? ""),
            title: String(lead.title ?? ""),
            industry: String(intent.industry ?? "Manufacturing"),
            location: String(intent.location ?? "Tamil Nadu"),
            intentSignals: intent.intentSignals ?? [],
            hook: hook ?? intent.hook,
            style
          });

          const lines = (text ?? "").trim().split("\n");
          const subjectLine = lines.find((l) => l.toLowerCase().startsWith("subject:"));
          const subject = subjectLine
            ? subjectLine.replace(/^subject:\s*/i, "").trim()
            : `Gridwise™ — ${STYLE_LABELS[style]}`;
          const bodyText = subjectLine
            ? lines.filter((l) => !l.toLowerCase().startsWith("subject:")).join("\n").trim()
            : (text ?? "").trim();

          return { id: crypto.randomUUID(), style, label: STYLE_LABELS[style], subject, body: bodyText, variation: i + 1 };
        } catch {
          return null;
        }
      })
    );

    const aiVariants = generated.filter(Boolean) as typeof variations;

    if (aiVariants.length > 0) {
      variations = aiVariants;
    } else {
      // AI failed — fall back to template variations
      variations = buildTemplateVariations(lead, hook);
    }
  } else {
    // No AI configured — use copywriter templates
    const templateVars = generateEmailVariations(
      lead as any,
      hook ?? intent.hook ?? "your latest initiative",
      notes ?? "keep the first sentence specific",
      5
    );
    variations = templateVars.map((v, i) => ({
      ...v,
      style: ALL_STYLES[i] ?? "direct",
      label: STYLE_LABELS[ALL_STYLES[i] ?? "direct"]
    }));
  }

  await saveLeadState({
    id: leadId,
    interest_status: reviewSignal.requiresReview ? "human_review" : "copy_generated",
    updated_at: new Date().toISOString(),
    metadata: {
      ...(lead.metadata as Record<string, unknown> | undefined),
      lastCopyHook: hook,
      aiVariantsGenerated: isAIConfigured(),
      humanReviewPending: reviewSignal.requiresReview
    }
  });

  return {
    status: reviewSignal.requiresReview ? "copy_flagged_for_review" : "copy_generated",
    leadId,
    reviewSignal,
    aiPowered: isAIConfigured(),
    variations
  };
}

function buildTemplateVariations(
  lead: Record<string, any>,
  hook?: string
): Array<{ id: string; style: EmailStyle; label: string; subject: string; body: string; variation: number }> {
  const name = String(lead.name ?? "").split(" ")[0] || "there";
  const company = String(lead.company ?? "your facility");
  const h = hook ?? "factory modernisation";

  return ALL_STYLES.map((style, i) => {
    let subject = "";
    let body = "";
    if (style === "efficiency") {
      subject = `30-35% operational cost reduction for ${company}`;
      body = `Hi ${name},\n\nGridwise™ redesigns factory floors to reduce movement-time waste and cut operational costs by 30-35% — without stopping production.\n\nWe'd love to offer ${company} a complimentary 30-min floor walk. When works for you?\n\nGridwise™ Team | Earthana EESPL | info@earthana.in | +91 99446 70888`;
    } else if (style === "sustainability") {
      subject = `Net Zero roadmap for ${company} — Gridwise™`;
      body = `Hi ${name},\n\nGridwise™ helps industrial facilities in Tamil Nadu achieve Net Zero certification (ISO 14001, LEED Industrial) while cutting energy costs by 28% on average.\n\nCan we schedule a 20-min call to walk through ${company}'s sustainability roadmap?\n\nGridwise™ Team | Earthana EESPL | info@earthana.in | +91 99446 70888`;
    } else if (style === "export") {
      subject = `ISO/Lean certification in 90 days — ${company}`;
      body = `Hi ${name},\n\nExport buyers are tightening audit standards. Gridwise™ fast-tracks ISO and Lean certification in 90 days through intelligent floor re-engineering.\n\nWould a free readiness assessment for ${company} be useful?\n\nGridwise™ Team | Earthana EESPL | info@earthana.in | +91 99446 70888`;
    } else if (style === "direct") {
      subject = `Quick question for ${company}`;
      body = `Hi ${name},\n\nWhen did ${company} last audit its factory floor layout for waste and movement inefficiency?\n\nGridwise™ Team | Earthana EESPL | info@earthana.in`;
    } else {
      subject = `Biophilic workspace ROI for ${company}`;
      body = `Hi ${name},\n\nGridwise™'s biophilic industrial design reduces absenteeism by 18-22% — making ${h} measurably safer and more productive.\n\nInterested in a 30-min floor assessment for ${company}?\n\nGridwise™ Team | Earthana EESPL | info@earthana.in | +91 99446 70888`;
    }
    return { id: crypto.randomUUID(), style, label: STYLE_LABELS[style], subject, body, variation: i + 1 };
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);
  try {
    const result = await closerAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
