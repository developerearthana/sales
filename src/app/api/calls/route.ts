import { NextRequest, NextResponse } from "next/server";
import {
  listRecentCalls,
  getCallStatus,
  cancelCall,
  getCallRecordings
} from "../../../lib/voiceClient";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const callSid = url.searchParams.get("callSid");
  const action = url.searchParams.get("action");

  try {
    if (callSid && action === "recordings") {
      const recordings = await getCallRecordings(callSid);
      return NextResponse.json({ recordings });
    }
    if (callSid) {
      const status = await getCallStatus(callSid);
      return NextResponse.json(status);
    }
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const calls = await listRecentCalls(limit);
    return NextResponse.json({ calls, count: calls.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, callSid } = await req.json();
    if (!action || !callSid) {
      return NextResponse.json({ error: "Missing action or callSid" }, { status: 400 });
    }
    if (action === "cancel") {
      const result = await cancelCall(callSid);
      return NextResponse.json(result);
    }
    if (action === "status") {
      const status = await getCallStatus(callSid);
      return NextResponse.json(status);
    }
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}
