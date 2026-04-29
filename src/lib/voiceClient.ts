import twilio from "twilio";
import { config } from "./config";

const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);

export async function createVoiceCall(to: string, payload: Record<string, unknown>) {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new Error("Twilio credentials are not configured.");
  }
  if (!config.twilioVoiceFrom) {
    throw new Error("TWILIO_VOICE_FROM is not configured.");
  }

  const script = payload.script ? String(payload.script) : "Hello, this is a quick follow up from our sales team.";
  const twiml = `<Response><Say>${script}</Say></Response>`;

  return twilioClient.calls.create({
    to,
    from: config.twilioVoiceFrom,
    twiml
  });
}
