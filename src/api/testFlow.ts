import { runOrchestrator } from "./orchestrator";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({
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
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  try {
    const result = await runOrchestrator(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
