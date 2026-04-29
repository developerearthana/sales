import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("superadmin");
  return res;
}
