import { supabase } from "./supabaseClient";

export async function getLeadState(leadId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveLeadState(payload: Record<string, unknown>) {
  const { error } = await supabase.from("leads").upsert(payload);
  if (error) {
    throw error;
  }
  return payload;
}

export async function routeTask(agentName: string, payload: unknown) {
  switch (agentName) {
    case "researcher":
      return { route: "/api/agents/research", payload };
    case "outbound":
      return { route: "/api/agents/outbound", payload };
    case "engagement":
      return { route: "/api/agents/engagement", payload };
    case "voice":
      return { route: "/api/agents/voice", payload };
    default:
      throw new Error(`Unknown agent route: ${agentName}`);
  }
}
