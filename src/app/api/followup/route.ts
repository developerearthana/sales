import { NextRequest, NextResponse } from "next/server";
import {
  getFollowUps, getPendingFollowUps, scheduleFollowUp,
  markFollowUpSent, skipFollowUp
} from "../../../lib/pipelineManager";
import { isSupabaseConfigured } from "../../../lib/supabaseClient";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [] });
  }
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const pending = searchParams.get("pending") === "1";

    const data = pending
      ? await getPendingFollowUps(50)
      : await getFollowUps({ leadId, status, limit: 100 });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { action, followUpId, leadId, dealId, channel, subject, message, scheduledAt } = body;

    if (action === "sent" && followUpId) {
      await markFollowUpSent(followUpId);
      return NextResponse.json({ status: "marked_sent" });
    }
    if (action === "skip" && followUpId) {
      await skipFollowUp(followUpId);
      return NextResponse.json({ status: "skipped" });
    }
    if (action === "schedule" && leadId && channel && message && scheduledAt) {
      const record = await scheduleFollowUp({ leadId, dealId, channel, subject, message, scheduledAt });
      return NextResponse.json({ data: record }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to process follow-up" }, { status: 500 });
  }
}
