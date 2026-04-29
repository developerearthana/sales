import { saveLeadState } from "../../lib/agentManager";
import { fetchCrmLeadByEmail, upsertCrmLead } from "../../lib/crmClient";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const lead = body as { id: string; email: string; name: string; company: string; title?: string };

  if (!lead?.id || !lead.email) {
    return new Response(JSON.stringify({ error: "Missing lead id or email" }), { status: 400 });
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

    return new Response(JSON.stringify({ status: "lead_exists", leadId: lead.id }), {
      headers: { "Content-Type": "application/json" }
    });
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

  return new Response(JSON.stringify({ status: "research_completed", leadId: lead.id }), {
    headers: { "Content-Type": "application/json" }
  });
}
