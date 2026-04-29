import { NextRequest, NextResponse } from "next/server";

// For demo: hardcoded superadmin credentials
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "admin";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "supersecret";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  
  if (username === SUPERADMIN_USERNAME && password === SUPERADMIN_PASSWORD) {
    // Set a simple cookie for session (for demo only)
    const res = NextResponse.json({ ok: true });
    res.cookies.set("superadmin", "1", { httpOnly: true, path: "/", sameSite: "lax" });
    return res;
  }
  return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
}
