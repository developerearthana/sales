import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "../../../api/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await runOrchestrator(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status: 400 });
  }
}
