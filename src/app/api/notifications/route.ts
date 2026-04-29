import { NextRequest, NextResponse } from "next/server";
import { getLeadNotifications } from "../../../lib/agentManager";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  try {
    const notifications = await getLeadNotifications(status);
    return NextResponse.json({ data: notifications ?? [], count: notifications?.length ?? 0 });
  } catch (error: any) {
    return NextResponse.json(
      { data: [], count: 0, warning: error?.message ?? "Failed to fetch notifications" },
      { status: 200 }
    );
  }
}
