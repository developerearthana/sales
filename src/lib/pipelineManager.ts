import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const DEAL_STAGES = [
  "discovered", "contacted", "engaged", "qualified",
  "proposal", "negotiation", "won", "lost"
] as const;
export type DealStage = typeof DEAL_STAGES[number];

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  discovered: 5, contacted: 15, engaged: 30, qualified: 50,
  proposal: 65, negotiation: 80, won: 100, lost: 0
};

function dbNotConfiguredError(): Error {
  return new Error("Database not configured. Set SUPABASE_URL and SUPABASE_KEY.");
}

function wrapNetworkError(err: unknown): never {
  const msg = (err as any)?.message ?? "fetch failed";
  throw new Error(`Database network error: ${msg}. Check SUPABASE_URL.`);
}

// ── Deals ──────────────────────────────────────────────────────────────────

export async function createDeal(params: {
  leadId: string;
  stage?: DealStage;
  value?: number;
  currency?: string;
  probability?: number;
  owner?: string;
  notes?: string;
  expectedCloseDate?: string;
}): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  const stage: DealStage = params.stage ?? "discovered";
  const record = {
    id: crypto.randomUUID(),
    lead_id: params.leadId,
    stage,
    value: params.value ?? 0,
    currency: params.currency ?? "INR",
    probability: params.probability ?? STAGE_PROBABILITY[stage],
    owner: params.owner ?? null,
    notes: params.notes ?? null,
    expected_close_date: params.expectedCloseDate ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  try {
    const { error } = await supabase.from("deals").insert(record);
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
  return record;
}

export async function getDeals(filters?: {
  stage?: string;
  leadId?: string;
  limit?: number;
}): Promise<Record<string, any>[]> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    let q = supabase.from("deals").select("*, leads(name,company,email,title)").order("updated_at", { ascending: false });
    if (filters?.stage) q = q.eq("stage", filters.stage);
    if (filters?.leadId) q = q.eq("lead_id", filters.leadId);
    if (filters?.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function advanceDeal(
  dealId: string,
  stage: DealStage,
  notes?: string
): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  const update: Record<string, any> = {
    stage,
    probability: STAGE_PROBABILITY[stage],
    updated_at: new Date().toISOString()
  };
  if (notes) update.notes = notes;
  if (stage === "won") update.won_at = new Date().toISOString();
  if (stage === "lost") update.lost_at = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from("deals")
      .update(update)
      .eq("id", dealId)
      .select()
      .single();
    if (error) throw error;
    return data ?? update;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function getDealsByLead(leadId: string): Promise<Record<string, any>[]> {
  return getDeals({ leadId });
}

export async function getDealStats(): Promise<{
  total: number;
  totalValue: number;
  wonValue: number;
  byStage: Record<string, { count: number; value: number }>;
}> {
  if (!isSupabaseConfigured()) {
    return { total: 0, totalValue: 0, wonValue: 0, byStage: {} };
  }
  try {
    const { data, error } = await supabase.from("deals").select("stage,value,currency");
    if (error) throw error;
    const rows = (data ?? []) as Array<{ stage: string; value: number }>;
    const byStage: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    let wonValue = 0;
    for (const row of rows) {
      if (!byStage[row.stage]) byStage[row.stage] = { count: 0, value: 0 };
      byStage[row.stage].count++;
      byStage[row.stage].value += Number(row.value ?? 0);
      totalValue += Number(row.value ?? 0);
      if (row.stage === "won") wonValue += Number(row.value ?? 0);
    }
    return { total: rows.length, totalValue, wonValue, byStage };
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

// ── Follow-ups ─────────────────────────────────────────────────────────────

export async function scheduleFollowUp(params: {
  leadId: string;
  dealId?: string;
  channel: "email" | "whatsapp" | "call";
  subject?: string;
  message: string;
  scheduledAt: Date | string;
}): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  const record = {
    id: crypto.randomUUID(),
    lead_id: params.leadId,
    deal_id: params.dealId ?? null,
    channel: params.channel,
    status: "scheduled",
    subject: params.subject ?? null,
    message: params.message,
    scheduled_at: params.scheduledAt instanceof Date
      ? params.scheduledAt.toISOString()
      : params.scheduledAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  try {
    const { error } = await supabase.from("follow_ups").insert(record);
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
  return record;
}

export async function getPendingFollowUps(limit = 50): Promise<Record<string, any>[]> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*, leads(name,company,email)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function getFollowUps(filters?: {
  leadId?: string;
  status?: string;
  limit?: number;
}): Promise<Record<string, any>[]> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    let q = supabase
      .from("follow_ups")
      .select("*, leads(name,company,email)")
      .order("scheduled_at", { ascending: true });
    if (filters?.leadId) q = q.eq("lead_id", filters.leadId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function markFollowUpSent(followUpId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", followUpId);
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export async function skipFollowUp(followUpId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw dbNotConfiguredError();
  try {
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "skipped", updated_at: new Date().toISOString() })
      .eq("id", followUpId);
    if (error) throw error;
  } catch (e: any) {
    if (e?.code !== undefined) throw e;
    wrapNetworkError(e);
  }
}

export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
