"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, RefreshCw, LogOut, Search, Mail, Phone, Zap,
  CheckCircle, XCircle, AlertTriangle, Target, TrendingUp,
  Shield, ChevronDown, ChevronUp, Loader2, MessageSquare,
  Activity, Users, Clock
} from "lucide-react";

type Lead = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  title?: string;
  interest_status?: string;
  human_review_required?: boolean;
  review_reason?: string;
  review_assigned_to?: string;
  automation_paused?: boolean;
  metadata?: Record<string, unknown>;
  updated_at?: string;
  created_at?: string;
};

type Notification = {
  id: string;
  lead_id?: string;
  category?: string;
  message?: string;
  status?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

type CloserResult = {
  status: string;
  leadId: string;
  reviewSignal?: { requiresReview: boolean; reason: string };
  variations?: Array<{ id: string; subject: string; body: string; variation: number }>;
};

const STATUS_STYLES: Record<string, string> = {
  new:            "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20",
  scouting:       "bg-purple-500/15 text-purple-300 border border-purple-500/20",
  outreach_sent:  "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  engaged:        "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  call_scheduled: "bg-green-500/15 text-green-300 border border-green-500/20",
  copy_generated: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20",
  human_review:   "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  existing:       "bg-slate-500/15 text-slate-300 border border-slate-500/20",
  cold:           "bg-rose-500/15 text-rose-400 border border-rose-500/20",
};

function StatusBadge({ status = "new" }: { status?: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-400";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Avatar({ name, company }: { name?: string; company?: string }) {
  const letter = (name?.[0] ?? company?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-sm font-bold text-white shadow-inner">
      {letter}
    </div>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Dashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Lead Scout
  const [scoutQuery, setScoutQuery] = useState("");
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutResult, setScoutResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Human review
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});

  // Agent actions
  const [agentLoading, setAgentLoading] = useState<Record<string, boolean>>({});
  const [agentToast, setAgentToast] = useState<{ key: string; ok: boolean; msg: string } | null>(null);

  // Closer modal
  const [closerData, setCloserData] = useState<CloserResult | null>(null);
  const [expandedNotifs, setExpandedNotifs] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, nr] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/notifications"),
      ]);
      if (lr.ok) {
        const d = await lr.json();
        setLeads(d.data ?? []);
      }
      if (nr.ok) {
        const d = await nr.json();
        setNotifications(d.data ?? []);
      }
    } catch {
      // silently handled — stale data stays visible
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleScout(e: React.FormEvent) {
    e.preventDefault();
    if (!scoutQuery.trim()) return;
    setScoutLoading(true);
    setScoutResult(null);
    try {
      const res = await fetch("/api/agents/leadScout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scoutQuery }),
      });
      const d = await res.json();
      if (res.ok) {
        setScoutResult({ ok: true, message: `Lead scouted (${d.leadId}): ${d.intent?.industry ?? ""} · ${d.intent?.seniority ?? ""} · ${Math.round((d.confidence ?? 0) * 100)}% confidence` });
        setScoutQuery("");
        await fetchData();
      } else {
        setScoutResult({ ok: false, message: d.error ?? "Scout failed" });
      }
    } catch {
      setScoutResult({ ok: false, message: "Network error" });
    }
    setScoutLoading(false);
  }

  async function handleReview(leadId: string, action: string) {
    setReviewLoading((p) => ({ ...p, [leadId]: true }));
    try {
      await fetch("/api/humanLoop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action, reviewer: "admin", notes: reviewNotes[leadId] ?? "" }),
      });
      await fetchData();
    } catch {
      // ignore
    }
    setReviewLoading((p) => ({ ...p, [leadId]: false }));
  }

  async function triggerAgent(agent: string, leadId: string, extra?: Record<string, unknown>) {
    const key = `${agent}-${leadId}`;
    setAgentLoading((p) => ({ ...p, [key]: true }));
    setAgentToast(null);
    try {
      const res = await fetch(`/api/agents/${agent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...extra }),
      });
      const d = await res.json();
      if (agent === "closer" && res.ok && d.variations) {
        setCloserData(d as CloserResult);
      }
      setAgentToast({ key, ok: res.ok, msg: d.status ?? (res.ok ? "Done" : d.error ?? "Failed") });
      if (res.ok) await fetchData();
    } catch {
      setAgentToast({ key, ok: false, msg: "Network error" });
    }
    setAgentLoading((p) => ({ ...p, [key]: false }));
    setTimeout(() => setAgentToast(null), 4000);
  }

  const reviewQueue = leads.filter((l) => l.human_review_required);
  const pipeline = leads.filter((l) => !l.human_review_required);
  const pendingNotifs = notifications.filter((n) => n.status === "pending");
  const visibleNotifs = expandedNotifs ? notifications : notifications.slice(0, 5);

  return (
    <div className="min-h-screen text-slate-100">

      {/* Sticky navbar */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Sales Automation</span>
          <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 sm:inline">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              router.push("/login");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Toast */}
      {agentToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-xl transition-all ${agentToast.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {agentToast.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {agentToast.msg}
        </div>
      )}

      {/* Closer variations modal */}
      {closerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setCloserData(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Closer — Email Variations</h2>
                {closerData.reviewSignal?.requiresReview && (
                  <p className="mt-1 text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Flagged for human review: {closerData.reviewSignal.reason}
                  </p>
                )}
              </div>
              <button onClick={() => setCloserData(null)} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {closerData.variations?.map((v) => (
                <div key={v.id} className="rounded-xl border border-white/8 bg-slate-800/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1">Variation {v.variation}</p>
                  <p className="text-sm font-medium text-white">{v.subject}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 whitespace-pre-line">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-20 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Leads", value: leads.length, icon: Users, color: "text-cyan-300", bg: "from-cyan-500/10 to-blue-500/10" },
            { label: "Review Queue", value: reviewQueue.length, icon: AlertTriangle, color: "text-amber-300", bg: "from-amber-500/10 to-orange-500/10" },
            { label: "Pipeline", value: pipeline.length, icon: TrendingUp, color: "text-emerald-300", bg: "from-emerald-500/10 to-green-500/10" },
            { label: "Notifications", value: pendingNotifs.length, icon: Bell, color: "text-purple-300", bg: "from-purple-500/10 to-indigo-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border border-white/8 bg-gradient-to-br ${bg} p-5 backdrop-blur-sm`}>
              <div className="flex items-start justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
                <Icon className={`h-5 w-5 ${color} opacity-80`} />
              </div>
              <p className="mt-1.5 text-xs uppercase tracking-widest text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Lead Scout */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <Search className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Lead Scout</h2>
              <p className="text-xs text-slate-500">Describe your ideal prospect in plain English</p>
            </div>
          </div>
          <form onSubmit={handleScout} className="flex gap-3">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="e.g. Fintech founders who raised Series A in the US..."
              value={scoutQuery}
              onChange={(e) => setScoutQuery(e.target.value)}
              disabled={scoutLoading}
            />
            <button
              type="submit"
              disabled={scoutLoading || !scoutQuery.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {scoutLoading ? "Scouting…" : "Scout"}
            </button>
          </form>
          {scoutResult && (
            <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${scoutResult.ok ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" : "border-red-500/25 bg-red-500/8 text-red-300"}`}>
              {scoutResult.ok ? <CheckCircle className="mr-2 inline h-4 w-4" /> : <XCircle className="mr-2 inline h-4 w-4" />}
              {scoutResult.message}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.55fr,1fr]">

          {/* Left — pipeline + review queue */}
          <div className="space-y-6">

            {/* Human Review Queue */}
            {reviewQueue.length > 0 && (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-white">Human Review Queue</h2>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                    {reviewQueue.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {reviewQueue.map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-amber-500/15 bg-slate-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={lead.name} company={lead.company} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-white">{lead.name ?? "Unknown"}</p>
                              <p className="text-xs text-slate-400">{lead.company} {lead.email ? `· ${lead.email}` : ""}</p>
                            </div>
                            <StatusBadge status="human_review" />
                          </div>
                          {lead.review_reason && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300/80">
                              <Shield className="h-3.5 w-3.5 shrink-0" /> {lead.review_reason}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              className="flex-1 rounded-lg border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                              placeholder="Optional notes…"
                              value={reviewNotes[lead.id] ?? ""}
                              onChange={(e) => setReviewNotes((p) => ({ ...p, [lead.id]: e.target.value }))}
                            />
                            <button
                              onClick={() => handleReview(lead.id, "approve")}
                              disabled={reviewLoading[lead.id]}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {reviewLoading[lead.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(lead.id, "reject")}
                              disabled={reviewLoading[lead.id]}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lead Pipeline */}
            <section className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">Lead Pipeline</h2>
                </div>
                <span className="text-xs text-slate-500">{pipeline.length} leads</span>
              </div>
              {pipeline.length > 0 ? (
                <div className="space-y-2">
                  {pipeline.slice(0, 15).map((lead) => {
                    const cKey = `closer-${lead.id}`;
                    const oKey = `outbound-${lead.id}`;
                    const vKey = `voice-${lead.id}`;
                    const hasPhone = !!(lead.metadata as any)?.phone;
                    return (
                      <div key={lead.id} className="group rounded-xl border border-white/6 bg-slate-900/50 p-4 transition hover:border-white/10 hover:bg-slate-900/70">
                        <div className="flex items-start gap-3">
                          <Avatar name={lead.name} company={lead.company} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">{lead.name ?? "Unknown"}</p>
                                <p className="text-xs text-slate-400">{lead.company ?? "—"}{lead.title ? ` · ${lead.title}` : ""}</p>
                              </div>
                              <StatusBadge status={lead.interest_status} />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => triggerAgent("closer", lead.id)}
                                disabled={agentLoading[cKey]}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25 disabled:opacity-50"
                              >
                                {agentLoading[cKey] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                Draft copy
                              </button>
                              {lead.email && (
                                <button
                                  onClick={() => triggerAgent("outbound", lead.id)}
                                  disabled={agentLoading[oKey]}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/25 disabled:opacity-50"
                                >
                                  {agentLoading[oKey] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                                  Send email
                                </button>
                              )}
                              {hasPhone && (
                                <button
                                  onClick={() => triggerAgent("voice", lead.id)}
                                  disabled={agentLoading[vKey]}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/15 px-2.5 py-1.5 text-xs font-medium text-green-300 transition hover:bg-green-500/25 disabled:opacity-50"
                                >
                                  {agentLoading[vKey] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                                  Voice call
                                </button>
                              )}
                              <span className="ml-auto text-xs text-slate-600">{timeAgo(lead.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {pipeline.length > 15 && (
                    <p className="text-center text-xs text-slate-500 pt-2">+ {pipeline.length - 15} more leads</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-slate-900/30 py-12 text-center">
                  <Target className="h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">No leads in pipeline yet.</p>
                  <p className="text-xs text-slate-600">Use Lead Scout above to source your first prospect.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">

            {/* Notifications */}
            <section className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4.5 w-4.5 text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">Notifications</h2>
                </div>
                {pendingNotifs.length > 0 && (
                  <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                    {pendingNotifs.length} pending
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {visibleNotifs.length > 0 ? (
                  visibleNotifs.map((n, i) => (
                    <div key={n.id ?? i} className="rounded-lg border border-white/6 bg-slate-900/50 p-3">
                      <p className="text-xs font-medium text-slate-200 leading-relaxed">{n.message ?? "Event"}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="uppercase tracking-wide">{n.category ?? "system"}</span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                        {n.status && n.status !== "pending" && (
                          <span className="ml-auto rounded-full bg-slate-700 px-1.5 py-0.5 text-slate-400">{n.status}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Bell className="h-8 w-8 text-slate-700" />
                    <p className="text-xs text-slate-500">No notifications yet</p>
                  </div>
                )}
                {notifications.length > 5 && (
                  <button
                    onClick={() => setExpandedNotifs((p) => !p)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800/60 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
                  >
                    {expandedNotifs ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Show {notifications.length - 5} more</>
                    )}
                  </button>
                )}
              </div>
            </section>

            {/* Agent Fleet */}
            <section className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <Activity className="h-4.5 w-4.5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Agent Fleet</h2>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Lead Scout", desc: "Prospect discovery", color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
                  { name: "Researcher", desc: "CRM enrichment", color: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
                  { name: "Closer", desc: "Copy generation", color: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" },
                  { name: "Outbound", desc: "Email delivery", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
                  { name: "Engagement", desc: "WhatsApp follow-up", color: "text-teal-300 bg-teal-500/10 border-teal-500/20" },
                  { name: "Voice", desc: "AI voice calls", color: "text-green-300 bg-green-500/10 border-green-500/20" },
                ].map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between rounded-xl border border-white/6 bg-slate-900/50 px-3.5 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.desc}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${agent.color}`}>
                      ready
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick tips */}
            <section className="rounded-2xl border border-white/8 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Workflow tips</h2>
              </div>
              <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/50" /> Scout a lead, then run <span className="text-cyan-300">Draft copy</span> to generate outreach variants.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/50" /> Leads with price/integration signals auto-enter <span className="text-amber-300">Review Queue</span>.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/50" /> Approved leads resume automation and get marked <span className="text-emerald-300">engaged</span>.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50" /> Dashboard auto-refreshes every 30 seconds.</li>
              </ul>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
