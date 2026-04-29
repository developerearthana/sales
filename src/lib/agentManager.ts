import { supabase, isSupabaseConfigured } from "./supabaseClient";

function dbNotConfiguredError(): Error {
  return new Error(
    "Database not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables."
  );
}

function wrapNetworkError(err: unknown): never {
  const msg = (err as any)?.message ?? "fetch failed";
  throw new Error(`Database network error: ${msg}. Check SUPABASE_URL.`);
}

export async function getLeadState(leadId: string): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (error) throw error;
    return data ?? {};
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function saveLeadState(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { error } = await supabase.from("leads").upsert(payload, { onConflict: "id" });
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
  return payload;
}

export async function getLeads(limit = 100): Promise<Record<string, any>[]> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function getLeadNotifications(status?: string): Promise<Record<string, any>[]> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    let query = supabase
      .from("lead_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function flagHumanReview(
  leadId: string,
  reason: string,
  nextAction = "review",
  assignedTo?: string
): Promise<Record<string, unknown>> {
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
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    id: leadId,
    human_review_required: false,
    automation_paused: false,
    interest_status: action === "approve" ? "engaged" : "cold",
    human_review_action: action,
    human_review_resolved_by: reviewer,
    human_review_notes: notes ?? null,
    updated_at: new Date().toISOString()
  };
  await saveLeadState(payload);
  await createLeadNotification(
    leadId,
    "human_review_resolved",
    `Review ${action}d by ${reviewer}`,
    { notes }
  );
  return payload;
}

export async function createLeadNotification(
  leadId: string,
  category: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  const record = {
    id: crypto.randomUUID(),
    lead_id: leadId,
    category,
    message,
    status: "pending",
    metadata: metadata ?? {},
    created_at: new Date().toISOString()
  };
  try {
    const { error } = await supabase.from("lead_notifications").insert(record);
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
  return record;
}

export async function routeTask(agentName: string, payload: unknown) {
  const routes: Record<string, string> = {
    researcher:  "/api/agents/research",
    leadScout:   "/api/agents/leadScout",
    outbound:    "/api/agents/outbound",
    engagement:  "/api/agents/engagement",
    voice:       "/api/agents/voice",
    closer:      "/api/agents/closer"
  };
  const route = routes[agentName];
  if (!route) throw new Error(`Unknown agent route: ${agentName}`);
  return { route, payload };
}
