import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn("[supabase] SUPABASE_URL or SUPABASE_KEY not set — database calls will fail.");
}

export const supabase = createClient(
  config.supabaseUrl || "https://placeholder.supabase.co",
  config.supabaseKey || "placeholder",
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
  metadata?: Record<string, unknown>;
};
