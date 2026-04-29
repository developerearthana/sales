import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

export function isSupabaseConfigured(): boolean {
  return !!(config.supabaseUrl && config.supabaseKey);
}

if (!isSupabaseConfigured()) {
  console.warn("[supabase] SUPABASE_URL or SUPABASE_KEY not set — DB calls will return errors.");
}

export const supabase = createClient(
  config.supabaseUrl || "https://placeholder.supabase.co",
  config.supabaseKey || "placeholder-key",
  { auth: { persistSession: false } }
);

export type LeadRecord = {
  id: string;
  email: string;
  name: string;
  company: string;
  title?: string;
  interest_status: string;
  last_contacted?: string;
  channel_blacklist?: string[];
  automation_paused?: boolean;
  human_review_required?: boolean;
  review_reason?: string;
  metadata?: Record<string, unknown>;
};
