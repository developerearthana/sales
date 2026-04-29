import { getLeadState, flagHumanReview, saveLeadState } from "../../lib/agentManager";
import { detectHumanInLoopSignals, generateEmailVariations } from "../../lib/copywriter";

export type CloserPayload = {
  leadId: string;
  hook?: string;
  notes?: string;
};

export async function closerAgent(body: unknown) {
  const payload = body as CloserPayload;
  const { leadId, hook, notes } = payload;

  if (!leadId) {
    throw new Error("Missing leadId");
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const reviewSignal = detectHumanInLoopSignals(notes ?? String(hook ?? ""), lead as any);
  if (reviewSignal.requiresReview) {
    await flagHumanReview(leadId, reviewSignal.reason, "pause_outreach", "copy-review-team");
  }

  const variations = generateEmailVariations(
    lead as any,
    hook ?? (lead.metadata as any)?.intent?.hook ?? "your latest initiative",
    notes ?? "I built a quick outreach concept that keeps the first sentence specific and human.",
    5
  );

  await saveLeadState({
    id: leadId,
    interest_status: reviewSignal.requiresReview ? "human_review" : "copy_generated",
    updated_at: new Date().toISOString(),
    metadata: {
      ...(lead.metadata as Record<string, unknown> | undefined),
      lastCopyHook: hook,
      humanReviewPending: reviewSignal.requiresReview
    }
  });

  return {
    status: reviewSignal.requiresReview ? "copy_flagged_for_review" : "copy_generated",
    leadId,
    reviewSignal,
    variations
  };
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
    const result = await closerAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
