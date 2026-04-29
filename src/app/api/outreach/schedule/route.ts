import { NextRequest, NextResponse } from "next/server";
import { processDueFollowUps } from "../../../../lib/outreachScheduler";
import { getFollowUps } from "../../../../lib/pipelineManager";
import { isSupabaseConfigured } from "../../../../lib/supabaseClient";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], stats: { due: 0, scheduled: 0 } });
  }
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId") ?? undefined;
    const status = searchParams.get("status") ?? "scheduled";

    const followUps = await getFollowUps({ leadId, status, limit: 100 });

    const now = new Date();
    const due = followUps.filter((f) => new Date(f.scheduled_at) <= now);
    const upcoming = followUps.filter((f) => new Date(f.scheduled_at) > now);

    return NextResponse.json({
      data: followUps,
      stats: { due: due.length, scheduled: upcoming.length, total: followUps.length }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit ?? 30);

    const result = await processDueFollowUps(limit);
    return NextResponse.json({ status: "scheduler_ran", ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Scheduler failed" }, { status: 500 });
  }
}
