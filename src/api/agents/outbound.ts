import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { fetchCrmLeadByEmail, upsertCrmLead } from "../../lib/crmClient";
import { sendEmail } from "../../lib/emailClient";

export async function outboundAgent(body: unknown) {
  const parsed = body as { leadId: string; message?: string };
  const { leadId, message } = parsed;

  if (!leadId) {
    throw new Error("Missing leadId");
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    throw new Error("Lead not found");
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

  return { status: "outbound_triggered", leadId, subject };
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
    const result = await outboundAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message ?? "Invalid request";
    return res.status(message === "Lead not found" ? 404 : 400).json({ error: message });
  }
}
