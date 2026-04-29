import { NextRequest, NextResponse } from "next/server";
import { closerAgent } from "../../../../api/agents/closer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await closerAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status: 400 });
  }
}
