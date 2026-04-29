import { resolveHumanReview } from "../lib/agentManager";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  const { leadId, action, reviewer, notes } = body as {
    leadId?: string;
    action?: string;
    reviewer?: string;
    notes?: string;
  };

  if (!leadId || !action || !reviewer) {
    return res.status(400).json({ error: "Missing leadId, action, or reviewer" });
  }

  try {
    const result = await resolveHumanReview(leadId, action, reviewer, notes);
    return res.status(200).json({ status: "review_resolved", ...result });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
