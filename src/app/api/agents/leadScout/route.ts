import { NextRequest, NextResponse } from "next/server";
import { leadScoutAgent } from "../../../../api/agents/leadScout";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await leadScoutAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status: 400 });
  }
}
