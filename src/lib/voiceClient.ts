import twilio from "twilio";
import { config } from "./config";

function getTwilioClient() {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured.");
  }
  return twilio(config.twilioAccountSid, config.twilioAuthToken);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwiml(script: string, callbackUrl?: string): string {
  const safe = escapeXml(script);
  const record = callbackUrl
    ? `<Record maxLength="3600" recordingStatusCallback="${callbackUrl}" recordingStatusCallbackMethod="POST" />`
    : "";
  return `<Response>
  <Say voice="Polly.Aditi" language="en-IN">${safe}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Press 1 to speak with our team now, or press 2 to schedule a callback.</Say>
  <Gather numDigits="1" timeout="10" action="${callbackUrl ?? ""}" method="POST">
    <Say voice="Polly.Aditi" language="en-IN">Please press a key or stay on the line.</Say>
  </Gather>
  ${record}
</Response>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createVoiceCall(
  to: string,
  payload: Record<string, unknown>
): Promise<{ callSid: string; status: string; to: string; from: string }> {
  if (!config.twilioVoiceFrom) {
    throw new Error("TWILIO_VOICE_FROM is not configured.");
  }

  const client = getTwilioClient();
  const script = String(payload.script ?? "Hello, this is a quick follow-up from the Gridwise team at Earthana.");
  const callbackUrl = payload.callbackUrl as string | undefined;
  const twiml = buildTwiml(script, callbackUrl);

  const call = await client.calls.create({
    to,
    from: config.twilioVoiceFrom,
    twiml,
    record: true,
    recordingStatusCallback: callbackUrl,
    recordingStatusCallbackMethod: "POST",
    statusCallback: callbackUrl,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"]
  });

  return { callSid: call.sid, status: call.status, to: call.to, from: call.from };
}

export async function getCallStatus(callSid: string) {
  const client = getTwilioClient();
  const call = await client.calls(callSid).fetch();
  return {
    callSid: call.sid,
    status: call.status,
    duration: call.duration,
    direction: call.direction,
    startTime: call.startTime,
    endTime: call.endTime
  };
}

export async function listRecentCalls(limit = 20) {
  const client = getTwilioClient();
  const calls = await client.calls.list({ limit });
  return calls.map((c) => ({
    callSid: c.sid,
    to: c.to,
    from: c.from,
    status: c.status,
    duration: c.duration,
    direction: c.direction,
    startTime: c.startTime
  }));
}

export async function cancelCall(callSid: string) {
  const client = getTwilioClient();
  const call = await client.calls(callSid).update({ status: "canceled" });
  return { callSid: call.sid, status: call.status };
}

export async function getCallRecordings(callSid: string) {
  const client = getTwilioClient();
  const recordings = await client.recordings.list({ callSid, limit: 10 });
  return recordings.map((r) => ({
    recordingSid: r.sid,
    callSid: r.callSid,
    duration: r.duration,
    status: r.status,
    url: `https://api.twilio.com${r.uri.replace(".json", ".mp3")}`
  }));
}
