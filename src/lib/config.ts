export const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_KEY ?? "",
  hubspotApiKey: process.env.HUBSPOT_API_KEY ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  sendgridFrom: process.env.SENDGRID_FROM ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioWhatsAppFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
  twilioVoiceFrom: process.env.TWILIO_VOICE_FROM ?? "",
  apolloApiKey: process.env.APOLLO_API_KEY ?? "",
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
  instantlyApiKey: process.env.INSTANTLY_API_KEY ?? "",
  retellApiKey: process.env.RETELL_API_KEY ?? "",
  retellPhoneFrom: process.env.RETELL_PHONE_FROM ?? "",
  retellAgentId: process.env.RETELL_AGENT_ID ?? "",
  watiApiKey: process.env.WATI_API_KEY ?? "",
  smartleadApiKey: process.env.SMARTLEAD_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? ""
};

export function requireEnv(varName: keyof typeof config): string {
  const value = config[varName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value;
}
