import { NextRequest, NextResponse } from "next/server";
import { resolveHumanReview } from "../../../lib/agentManager";

export async function POST(req: NextRequest) {
  try {
    const { leadId, action, reviewer, notes } = await req.json() as {
      leadId?: string;
      action?: string;
      reviewer?: string;
      notes?: string;
    };
    if (!leadId || !action || !reviewer) {
      return NextResponse.json({ error: "Missing leadId, action, or reviewer" }, { status: 400 });
    }
    const result = await resolveHumanReview(leadId, action, reviewer, notes);
    return NextResponse.json({ status: "review_resolved", ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status: 400 });
  }
}
