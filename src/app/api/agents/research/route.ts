import { NextRequest, NextResponse } from "next/server";
import { researchAgent } from "../../../../api/agents/research";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await researchAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status: 400 });
  }
}
