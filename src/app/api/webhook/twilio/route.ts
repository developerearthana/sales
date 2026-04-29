import { NextRequest, NextResponse } from "next/server";
import { saveLeadState, createLeadNotification } from "../../../../lib/agentManager";
import { isSupabaseConfigured } from "../../../../lib/supabaseClient";

// Twilio sends URL-encoded form data for status/recording callbacks
async function parseFormData(req: NextRequest): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent((v ?? "").replace(/\+/g, " "));
  }
  return params;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const params = await parseFormData(req);

    const callSid = params.CallSid ?? params.RecordingSid;
    const callStatus = params.CallStatus;
    const recordingUrl = params.RecordingUrl;
    const recordingDuration = params.RecordingDuration;

    // Recording callback
    if (recordingUrl && leadId && isSupabaseConfigured()) {
      try {
        const lead = await import("../../../../lib/agentManager").then((m) => m.getLeadState(leadId).catch(() => null));
        const existingMeta = (lead as any)?.metadata ?? {};
        await saveLeadState({
          id: leadId,
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMeta,
            lastCallSid: callSid,
            lastRecordingUrl: recordingUrl,
            lastRecordingDuration: recordingDuration
          }
        });
        await createLeadNotification(leadId, "call_recording", `Call recording available (${recordingDuration}s)`, {
          callSid,
          recordingUrl,
          recordingDuration
        });
      } catch (err) {
        console.error("[twilio-webhook] recording update failed:", err);
      }
      return NextResponse.json({ status: "recording_stored" });
    }

    // Call status callback
    if (callStatus && leadId && isSupabaseConfigured()) {
      const statusMap: Record<string, string> = {
        answered: "call_answered",
        completed: "call_completed",
        busy: "call_busy",
        "no-answer": "call_no_answer",
        failed: "call_failed",
        canceled: "call_canceled"
      };

      const interestStatus = callStatus === "answered" || callStatus === "completed"
        ? "call_scheduled"
        : undefined;

      try {
        const updatePayload: Record<string, unknown> = {
          id: leadId,
          updated_at: new Date().toISOString(),
          metadata: {
            lastCallSid: callSid,
            lastCallStatus: callStatus,
            lastCallAt: new Date().toISOString()
          }
        };
        if (interestStatus) updatePayload.interest_status = interestStatus;
        await saveLeadState(updatePayload);
        await createLeadNotification(
          leadId,
          statusMap[callStatus] ?? "call_event",
          `Twilio call ${callStatus} (${callSid})`,
          { callStatus, callSid }
        );
      } catch (err) {
        console.error("[twilio-webhook] status update failed:", err);
      }
    }

    // Always return 200 to Twilio to prevent retries
    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("[twilio-webhook] error:", err);
    return NextResponse.json({ status: "ok" });
  }
}

// Twilio requires the endpoint to accept GET for verification in some configurations
export async function GET() {
  return NextResponse.json({ status: "twilio-webhook-ready" });
}
