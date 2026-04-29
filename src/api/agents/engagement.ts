import { getLeadState, saveLeadState } from "../../lib/agentManager";
import { sendWhatsAppMessage } from "../../lib/whatsappClient";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { leadId, channel, event, message } = body as {
    leadId: string;
    channel: string;
    event: string;
    message?: string;
  };

  if (!leadId || !channel || !event) {
    return new Response(JSON.stringify({ error: "Missing leadId, channel, or event" }), { status: 400 });
  }

  const lead = await getLeadState(leadId);
  if (!lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
  }

  const outgoingMessage = message ?? `Hi ${lead.name ?? "there"}, I wanted to follow up on a quick idea for ${lead.company}.`;
  const destination = (lead.metadata as any)?.phone ?? "";
  if (!destination) {
    return new Response(JSON.stringify({ error: "No WhatsApp destination available for lead" }), { status: 400 });
  }

  await sendWhatsAppMessage(destination, outgoingMessage);

  const update = {
    id: leadId,
    interest_status: event === "not_interested" ? "cold" : "engaged",
    channel_blacklist: event === "not_interested" ? [channel] : lead.channel_blacklist ?? [],
    updated_at: new Date().toISOString()
  };

  await saveLeadState(update);

  return new Response(JSON.stringify({ status: "engagement_recorded", leadId, channel, event }), {
    headers: { "Content-Type": "application/json" }
  });
}
