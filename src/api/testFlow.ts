import orchestrator from "./orchestrator";

export default async function handler(req: Request) {
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      message: "Send a POST request to this endpoint to start a sample lead flow.",
      sampleBody: {
        agent: "researcher",
        lead: {
          id: "lead-001",
          email: "lead@example.com",
          name: "Alex Prospect",
          company: "Example Co",
          title: "Founder"
        }
      }
    }), { headers: { "Content-Type": "application/json" } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const request = new Request("https://orchestrator.local/api/orchestrator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: req.body
  });

  return orchestrator(request as Request);
}
