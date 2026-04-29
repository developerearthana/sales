import { NextRequest, NextResponse } from "next/server";
import { saveLeadState, createLeadNotification } from "../../../../lib/agentManager";
import { isSupabaseConfigured } from "../../../../lib/supabaseClient";

// Retell AI sends JSON POST for call lifecycle events
// Events: call_started, call_ended, call_analyzed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ status: "ok" });

    const event   = body.event as string;
    const call    = body.data ?? body.call ?? body;
    const callId  = call?.call_id as string | undefined;
    const meta    = call?.metadata as Record<string, string> | undefined;
    const leadId  = meta?.leadId;

    if (!leadId || !isSupabaseConfigured()) {
      return NextResponse.json({ status: "ok" });
    }

    if (event === "call_started") {
      await saveLeadState({
        id: leadId,
        updated_at: new Date().toISOString(),
        metadata: { lastCallId: callId, lastCallStatus: "in_progress", lastCallEngine: "retell" }
      });
      await createLeadNotification(leadId, "call_answered", `Retell call answered (${callId})`, { callId });
    }

    if (event === "call_ended") {
      const status = call?.call_status ?? "completed";
      await saveLeadState({
        id: leadId,
        interest_status: status === "ended" ? "call_scheduled" : "call_scheduled",
        last_contacted: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          lastCallId: callId,
          lastCallStatus: status,
          lastCallDuration: call?.end_timestamp
            ? Math.round((call.end_timestamp - (call.start_timestamp ?? call.end_timestamp)) / 1000)
            : undefined,
          lastCallEngine: "retell"
        }
      });
      await createLeadNotification(leadId, "call_completed", `Retell call ended (${callId})`, {
        callId,
        status,
        duration: call?.end_timestamp && call?.start_timestamp
          ? Math.round((call.end_timestamp - call.start_timestamp) / 1000) + "s"
          : undefined
      });
    }

    if (event === "call_analyzed") {
      const analysis = call?.call_analysis ?? {};
      const sentiment = analysis.user_sentiment as string | undefined;
      const summary   = analysis.call_summary as string | undefined;
      const transcript = call?.transcript as string | undefined;

      // Map sentiment to interest status
      const interestMap: Record<string, string> = {
        Positive: "engaged",
        Negative: "cold",
        Neutral: "call_scheduled"
      };

      await saveLeadState({
        id: leadId,
        interest_status: interestMap[sentiment ?? ""] ?? "call_scheduled",
        updated_at: new Date().toISOString(),
        metadata: {
          lastCallId: callId,
          lastCallSentiment: sentiment,
          lastCallSummary: summary,
          lastCallTranscript: transcript?.slice(0, 2000),
          lastCallRecordingUrl: call?.recording_url,
          lastCallEngine: "retell"
        }
      });

      await createLeadNotification(
        leadId,
        "call_analyzed",
        `Call analysis: ${sentiment ?? "unknown"} sentiment — ${summary?.slice(0, 100) ?? ""}`,
        { callId, sentiment, summary }
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("[webhook/retell]", err);
    return NextResponse.json({ status: "ok" }); // always 200 to Retell
  }
}

export async function GET() {
  return NextResponse.json({ status: "retell-webhook-ready" });
}
