import { getLeads } from "../lib/agentManager";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = Number(req.query?.limit ?? 100);
  try {
    const leads = await getLeads(limit);
    return res.status(200).json({ leads, ready: true });
  } catch (error: any) {
    return res.status(200).json({ leads: [], ready: false, warning: error?.message ?? "Failed to fetch leads" });
  }
}
