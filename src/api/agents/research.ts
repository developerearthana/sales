import { saveLeadState } from "../../lib/agentManager";
import { fetchCrmLeadByEmail, upsertCrmLead } from "../../lib/crmClient";

export type LeadPayload = {
  id: string;
  email: string;
  name: string;
  company: string;
  title?: string;
};

export async function researchAgent(body: unknown) {
  const lead = body as LeadPayload;
  if (!lead?.id || !lead.email) {
    throw new Error("Missing lead id or email");
  }

  const existingCrmLead = await fetchCrmLeadByEmail(lead.email);
  if (existingCrmLead) {
    const existingProperties = existingCrmLead.properties as Record<string, unknown> | undefined;
    const channelBlacklistValue = existingProperties?.channel_blacklist;
    const channelBlacklist = Array.isArray(channelBlacklistValue)
      ? channelBlacklistValue.map(String)
      : channelBlacklistValue
      ? String(channelBlacklistValue).split(",").map((v) => v.trim())
      : [];

    await saveLeadState({
      ...lead,
      interest_status: "existing",
      channel_blacklist: channelBlacklist,
      updated_at: new Date().toISOString()
    });

    return { status: "lead_exists", leadId: lead.id };
  }

  await upsertCrmLead({
    id: lead.id,
    email: lead.email,
    name: lead.name,
    company: lead.company,
    title: lead.title,
    status: "new"
  });

  await saveLeadState({
    ...lead,
    interest_status: "new",
    last_contacted: null,
    channel_blacklist: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return { status: "research_completed", leadId: lead.id };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  try {
    const result = await researchAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
