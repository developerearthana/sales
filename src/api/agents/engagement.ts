import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { sendWhatsAppMessage } from "../../lib/whatsappClient";

export async function engagementAgent(body: unknown) {
  const payload = body as {
    leadId: string;
    channel: string;
    event: string;
    message?: string;
  };
  const { leadId, channel, event, message } = payload;

  if (!leadId || !channel || !event) {
    throw new Error("Missing leadId, channel, or event");
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const outgoingMessage = message ?? `Hi ${lead.name ?? "there"}, I wanted to follow up on a quick idea for ${lead.company}.`;
  const destination = (lead.metadata as any)?.phone ?? "";
  if (!destination) {
    throw new Error("No WhatsApp destination available for lead");
  }

  await sendWhatsAppMessage(destination, outgoingMessage);

  const update = {
    id: leadId,
    interest_status: event === "not_interested" ? "cold" : "engaged",
    channel_blacklist: event === "not_interested" ? [channel] : lead.channel_blacklist ?? [],
    updated_at: new Date().toISOString()
  };

  await saveLeadState(update);

  return { status: "engagement_recorded", leadId, channel, event };
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
    const result = await engagementAgent(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message ?? "Invalid request";
    return res.status(message === "Lead not found" ? 404 : 400).json({ error: message });
  }
}
