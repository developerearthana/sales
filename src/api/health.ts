export default async function handler(req: Request) {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" }
  });
}
