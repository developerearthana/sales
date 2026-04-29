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
  const { error } = await supabase.from("leads").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }
  return payload;
}

export async function getLeads(limit = 100) {
  const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (error) {
    throw error;
  }
  return data;
}

export async function getLeadNotifications(status?: string) {
  let query = supabase.from("lead_notifications").select("*").order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}

export async function flagHumanReview(
  leadId: string,
  reason: string,
  nextAction = "review",
  assignedTo?: string
) {
  const payload: Record<string, unknown> = {
    id: leadId,
    human_review_required: true,
    review_reason: reason,
    review_assigned_to: assignedTo ?? "sales-review",
    automation_paused: true,
    next_action: nextAction,
    updated_at: new Date().toISOString()
  };

  await saveLeadState(payload);
  await createLeadNotification(leadId, "human_review", reason, { nextAction, assignedTo });
  return payload;
}

export async function resolveHumanReview(
  leadId: string,
  action: string,
  reviewer: string,
  notes?: string
) {
  const payload: Record<string, unknown> = {
    id: leadId,
    human_review_required: false,
    automation_paused: false,
    human_review_action: action,
    human_review_resolved_by: reviewer,
    human_review_notes: notes ?? null,
    updated_at: new Date().toISOString()
  };

  await saveLeadState(payload);
  await createLeadNotification(leadId, "human_review_resolved", `${action} completed by ${reviewer}`, { notes });
  return payload;
}

export async function createLeadNotification(
  leadId: string,
  category: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const record = {
    id: crypto.randomUUID(),
    lead_id: leadId,
    category,
    message,
    status: "pending",
    metadata: metadata ?? {},
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("lead_notifications").insert(record);
  if (error) {
    throw error;
  }
  return record;
}

export async function routeTask(agentName: string, payload: unknown) {
  switch (agentName) {
    case "researcher":
      return { route: "/api/agents/research", payload };
    case "leadScout":
      return { route: "/api/agents/leadScout", payload };
    case "outbound":
      return { route: "/api/agents/outbound", payload };
    case "engagement":
      return { route: "/api/agents/engagement", payload };
    case "voice":
      return { route: "/api/agents/voice", payload };
    case "closer":
      return { route: "/api/agents/closer", payload };
    default:
      throw new Error(`Unknown agent route: ${agentName}`);
  }
}
