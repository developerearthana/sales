import { NextRequest, NextResponse } from "next/server";
import {
  getDeals, createDeal, advanceDeal, getDealStats, type DealStage
} from "../../../lib/pipelineManager";
import { isSupabaseConfigured } from "../../../lib/supabaseClient";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], stats: { total: 0, totalValue: 0, wonValue: 0, byStage: {} } });
  }
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") ?? undefined;
    const leadId = searchParams.get("leadId") ?? undefined;
    const withStats = searchParams.get("stats") === "1";

    const [deals, stats] = await Promise.all([
      getDeals({ stage, leadId, limit: 200 }),
      withStats ? getDealStats() : Promise.resolve(null)
    ]);

    return NextResponse.json({ data: deals, ...(stats && { stats }) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { leadId, stage, value, currency, probability, owner, notes, expectedCloseDate } = body;
    if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

    const deal = await createDeal({ leadId, stage, value, currency, probability, owner, notes, expectedCloseDate });
    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to create deal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { dealId, stage, notes } = body;
    if (!dealId || !stage) return NextResponse.json({ error: "Missing dealId or stage" }, { status: 400 });

    const deal = await advanceDeal(dealId, stage as DealStage, notes);
    return NextResponse.json({ data: deal });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to advance deal" }, { status: 500 });
  }
}
