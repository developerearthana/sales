import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { fetchCrmLeadByEmail, upsertCrmLead } from "../../lib/crmClient";
import { sendEmail } from "../../lib/emailClient";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { leadId, message } = body as { leadId: string; message?: string };

  if (!leadId) {
    return new Response(JSON.stringify({ error: "Missing leadId" }), { status: 400 });
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
  }

  const crmLead = await fetchCrmLeadByEmail(lead.email as string);
  if (!crmLead) {
    await upsertCrmLead({
      id: leadId,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      title: lead.title,
      status: "outreach"
    });
  }

  const subject = `Quick note for ${lead.name ?? lead.company}`;
  const html = message ?? `Hello ${lead.name ?? "there"},\n\nI noticed your work at ${lead.company}. I'd love to share a tailored idea with you.`;

  await sendEmail(lead.email as string, subject, html);
  await saveLeadState({
    id: leadId,
    interest_status: "outreach_sent",
    last_contacted: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({ status: "outbound_triggered", leadId, subject }), {
    headers: { "Content-Type": "application/json" }
  });
}
