import { NextRequest, NextResponse } from "next/server";
import { getLeads } from "../../../lib/agentManager";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  try {
    const leads = await getLeads(limit);
    return NextResponse.json({ data: leads ?? [], count: leads?.length ?? 0 });
  } catch (error: any) {
    return NextResponse.json(
      { data: [], count: 0, warning: error?.message ?? "Failed to fetch leads" },
      { status: 200 }
    );
  }
}
