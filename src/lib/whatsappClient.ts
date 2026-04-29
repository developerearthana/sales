import twilio from "twilio";
import { config } from "./config";

const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);

export async function sendWhatsAppMessage(to: string, message: string) {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new Error("Twilio credentials are not configured.");
  }
  if (!config.twilioWhatsAppFrom) {
    throw new Error("TWILIO_WHATSAPP_FROM is not configured.");
  }

  const from = config.twilioWhatsAppFrom.startsWith("whatsapp:")
    ? config.twilioWhatsAppFrom
    : `whatsapp:${config.twilioWhatsAppFrom}`;
  const toAddress = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  return twilioClient.messages.create({
    body: message,
    from,
    to: toAddress
  });
}
