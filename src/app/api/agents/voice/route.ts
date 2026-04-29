import { NextRequest, NextResponse } from "next/server";
import { voiceAgent } from "../../../../api/agents/voice";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await voiceAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    const msg = error?.message ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: msg === "Lead not found" ? 404 : 400 });
  }
}
