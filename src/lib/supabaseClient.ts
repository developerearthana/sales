import { createClient } from "@supabase/supabase-js";
import { config, requireEnv } from "./config";

const supabaseUrl = requireEnv("supabaseUrl");
const supabaseKey = requireEnv("supabaseKey");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

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
