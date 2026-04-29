"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, RefreshCw, LogOut, Search, Mail, Phone, Zap,
  CheckCircle, XCircle, AlertTriangle, Target, TrendingUp,
  Shield, ChevronDown, ChevronUp, Loader2, MessageSquare,
  Activity, Users, Clock, Building2, IndianRupee, BarChart3,
  Kanban, Bot, ListChecks, GitBranch, Filter, Send, PhoneCall,
  Globe, Database, Linkedin, BookOpen, Play, RotateCcw,
  Download, Plus, ExternalLink, Cpu
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Lead = {
  id: string; name?: string; email?: string; company?: string; title?: string;
  interest_status?: string; human_review_required?: boolean; review_reason?: string;
  automation_paused?: boolean; metadata?: Record<string, unknown>;
  updated_at?: string; created_at?: string;
};
type Notification = {
  id: string; lead_id?: string; category?: string; message?: string;
  status?: string; created_at?: string; metadata?: Record<string, unknown>;
};
type Deal = {
  id: string; lead_id: string; stage: string; value: number; currency: string;
  probability: number; owner?: string; notes?: string;
  created_at?: string; updated_at?: string;
  leads?: { name?: string; company?: string; email?: string; title?: string };
};
type FollowUp = {
  id: string; lead_id: string; channel: string; status: string;
  subject?: string; message?: string; scheduled_at: string; sent_at?: string;
  leads?: { name?: string; company?: string; email?: string };
};
type CloserVariation = {
  id: string; style: string; label: string; subject: string; body: string; variation: number;
};
type CloserResult = {
  status: string; leadId: string; aiPowered?: boolean;
  reviewSignal?: { requiresReview: boolean; reason: string };
  variations?: CloserVariation[];
};
type ScrapedContact = {
  id: string; name?: string; title?: string; email?: string;
  phone?: string; linkedin?: string; company?: string;
  source: string; confidence: number; aiScore?: number; aiReasoning?: string;
};
type WebsiteAnalysis = {
  companyName: string; industry: string; location: string; employeeEstimate: string;
  businessSummary: string; painPoints: string[]; gridwiseFit: number;
  gridwiseFitReason: string; targetTitles: string[]; outreachAngle: string;
  intentSignals: string[];
};
type ScrapeResult = {
  status: string; source: string; url: string; domain?: string; pageTitle?: string;
  contactsFound: number; savedCount: number; contacts: ScrapedContact[];
  analysis?: WebsiteAnalysis;
};
type Tab = "pipeline" | "scraper" | "agents" | "deals" | "activity";
type EmailStyle = "efficiency" | "sustainability" | "export" | "direct" | "wellbeing";

// ─── Constants ──────────────────────────────────────────────────────────────

const DEAL_STAGES = ["discovered","contacted","engaged","qualified","proposal","negotiation","won","lost"] as const;

const PIPELINE_COLUMNS = [
  { key: "new",            label: "New",       color: "border-cyan-500/30 bg-cyan-500/5" },
  { key: "scouting",       label: "Scouting",  color: "border-purple-500/30 bg-purple-500/5" },
  { key: "outreach_sent",  label: "Contacted", color: "border-blue-500/30 bg-blue-500/5" },
  { key: "engaged",        label: "Engaged",   color: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "copy_generated", label: "Proposal",  color: "border-indigo-500/30 bg-indigo-500/5" },
  { key: "human_review",   label: "Review",    color: "border-amber-500/30 bg-amber-500/5" },
  { key: "cold",           label: "Cold",      color: "border-rose-500/30 bg-rose-500/5" },
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  scouting: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  outreach_sent: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  engaged: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  call_scheduled: "bg-green-500/15 text-green-300 border-green-500/20",
  copy_generated: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  human_review: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  cold: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  discovered: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  qualified: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  proposal: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  negotiation: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  lost: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

const NOTIF_ICON: Record<string, string> = {
  lead_scout: "🔍", outbound_email: "📧", human_review: "⚠️",
  human_review_resolved: "✅", call_recording: "🎙️", call_answered: "📞",
  call_completed: "✅", call_failed: "❌", call_analyzed: "🧠",
  scraper: "🕷️", inbound_reply: "💬", auto_reply: "🤖",
  follow_up_email: "📬", follow_up_whatsapp: "💬", follow_up_call: "📞",
};

const SCRAPER_SOURCES = [
  { key: "website",   label: "Website Analysis",   icon: Globe,     placeholder: "https://company.com" },
  { key: "sipcot",    label: "SIPCOT Directory",    icon: Database,  placeholder: "automotive components" },
  { key: "indiamart", label: "IndiaMart",           icon: BookOpen,  placeholder: "precision machining Chennai" },
  { key: "cii",       label: "CII Directory",       icon: Building2, placeholder: "manufacturing textile" },
  { key: "linkedin",  label: "LinkedIn Domain",     icon: Linkedin,  placeholder: "company name or domain" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status = "new" }: { status?: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Avatar({ name, company, size = "md" }: { name?: string; company?: string; size?: "sm" | "md" }) {
  const letter = (name?.[0] ?? company?.[0] ?? "?").toUpperCase();
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 font-bold text-white shadow-inner ${size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"}`}>
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

function formatINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-cyan-500" : score >= 30 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-700">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 tabular-nums">{score}</span>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<FollowUp[]>([]);
  const [dealStats, setDealStats] = useState<{ total: number; totalValue: number; wonValue: number; byStage: Record<string, { count: number; value: number }> } | null>(null);
  const [loading, setLoading] = useState(false);

  // Scraper state
  const [scraperSource, setScraperSource] = useState<string>("website");
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraperTitles, setScraperTitles] = useState("");
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [savingContacts, setSavingContacts] = useState(false);

  // Lead Scout
  const [scoutQuery, setScoutQuery] = useState("");
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutResult, setScoutResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Human review
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});

  // Agent actions
  const [agentLoading, setAgentLoading] = useState<Record<string, boolean>>({});
  const [agentToast, setAgentToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [agentForms, setAgentForms] = useState<Record<string, Record<string, string>>>({});

  // Closer modal
  const [closerData, setCloserData] = useState<CloserResult | null>(null);
  const [closerLeadId, setCloserLeadId] = useState("");
  const [closerHook, setCloserHook] = useState("");

  // Scheduler
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null);

  // Notifications
  const [notifFilter, setNotifFilter] = useState("all");
  const [expandedNotifs, setExpandedNotifs] = useState(false);

  // Deals
  const [advanceLoading, setAdvanceLoading] = useState<Record<string, boolean>>({});

  // ── Data fetch ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, nr, dr, fr] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/notifications"),
        fetch("/api/pipeline?stats=1"),
        fetch("/api/followup?pending=1")
      ]);
      if (lr.ok) { const d = await lr.json(); setLeads(d.data ?? []); }
      if (nr.ok) { const d = await nr.json(); setNotifications(d.data ?? []); }
      if (dr.ok) { const d = await dr.json(); setDeals(d.data ?? []); if (d.stats) setDealStats(d.stats); }
      if (fr.ok) { const d = await fr.json(); setPendingFollowUps(d.data ?? []); }
    } catch { /* stale data stays */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30_000); return () => clearInterval(t); }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function showToast(ok: boolean, msg: string) {
    setAgentToast({ ok, msg });
    setTimeout(() => setAgentToast(null), 4000);
  }

  function setAgentField(agent: string, field: string, value: string) {
    setAgentForms((p) => ({ ...p, [agent]: { ...(p[agent] ?? {}), [field]: value } }));
  }
  function getAgentField(agent: string, field: string) { return agentForms[agent]?.[field] ?? ""; }

  async function handleScout(e: React.FormEvent) {
    e.preventDefault();
    if (!scoutQuery.trim()) return;
    setScoutLoading(true); setScoutResult(null);
    try {
      const res = await fetch("/api/agents/leadScout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scoutQuery })
      });
      const d = await res.json();
      setScoutResult(res.ok
        ? { ok: true, message: `${d.leadCount ?? 1} lead(s) — ${d.savedCount ?? 0} saved · ${d.intent?.industry ?? ""} · ${Math.round((d.confidence ?? 0) * 100)}% confidence` }
        : { ok: false, message: d.error ?? "Scout failed" }
      );
      if (res.ok) { setScoutQuery(""); await fetchData(); }
    } catch { setScoutResult({ ok: false, message: "Network error" }); }
    setScoutLoading(false);
  }

  async function handleReview(leadId: string, action: string) {
    setReviewLoading((p) => ({ ...p, [leadId]: true }));
    try {
      await fetch("/api/humanLoop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action, reviewer: "admin", notes: reviewNotes[leadId] ?? "" })
      });
      await fetchData();
    } catch { /* ignore */ }
    setReviewLoading((p) => ({ ...p, [leadId]: false }));
  }

  async function triggerAgent(agent: string, leadId: string, extra?: Record<string, unknown>) {
    const key = `${agent}-${leadId}`;
    setAgentLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/agents/${agent}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...extra })
      });
      const d = await res.json();
      if (agent === "closer" && res.ok && d.variations) setCloserData(d as CloserResult);
      showToast(res.ok, d.status ?? (res.ok ? "Done" : d.error ?? "Failed"));
      if (res.ok) await fetchData();
    } catch { showToast(false, "Network error"); }
    setAgentLoading((p) => ({ ...p, [key]: false }));
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!scraperUrl.trim()) return;
    setScraperLoading(true); setScrapeResult(null); setSelectedContacts(new Set());
    try {
      const res = await fetch("/api/agents/scraper", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scraperUrl.trim(),
          source: scraperSource,
          targetTitles: scraperTitles.trim() ? scraperTitles.split(",").map((t) => t.trim()) : undefined,
          maxContacts: 20
        })
      });
      const d = await res.json();
      if (res.ok) setScrapeResult(d as ScrapeResult);
      else showToast(false, d.error ?? "Scrape failed");
    } catch { showToast(false, "Network error"); }
    setScraperLoading(false);
  }

  function toggleContact(id: string) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveSelectedContacts() {
    if (!scrapeResult) return;
    setSavingContacts(true);
    try {
      const toSave = scrapeResult.contacts.filter((c) => selectedContacts.has(c.id));
      const res = await fetch("/api/agents/scraper", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: toSave.map((c) => ({
            ...c,
            scraperUrl: scrapeResult.url,
            analysis: scrapeResult.analysis ? {
              industry: scrapeResult.analysis.industry,
              location: scrapeResult.analysis.location,
              gridwiseFit: scrapeResult.analysis.gridwiseFit,
              outreachAngle: scrapeResult.analysis.outreachAngle
            } : undefined
          }))
        })
      });
      const d = await res.json();
      showToast(res.ok, res.ok ? `${d.savedCount} contact(s) saved to CRM` : d.error ?? "Save failed");
      if (res.ok) { setSelectedContacts(new Set()); await fetchData(); }
    } catch { showToast(false, "Network error"); }
    setSavingContacts(false);
  }

  async function saveAllContacts() {
    if (!scrapeResult) return;
    setSavingContacts(true);
    try {
      const res = await fetch("/api/agents/scraper", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeResult.url, source: scrapeResult.source, saveAll: true })
      });
      const d = await res.json();
      showToast(res.ok, res.ok ? `${d.savedCount} contact(s) saved to CRM` : d.error ?? "Save failed");
      if (res.ok) await fetchData();
    } catch { showToast(false, "Network error"); }
    setSavingContacts(false);
  }

  async function runScheduler() {
    setSchedulerLoading(true);
    try {
      const res = await fetch("/api/outreach/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 30 }) });
      const d = await res.json();
      setSchedulerResult({ processed: d.processed ?? 0, succeeded: d.succeeded ?? 0, failed: d.failed ?? 0 });
      showToast(res.ok, `Scheduler: ${d.succeeded ?? 0} sent, ${d.failed ?? 0} failed`);
      if (res.ok) await fetchData();
    } catch { showToast(false, "Scheduler error"); }
    setSchedulerLoading(false);
  }

  async function handleAdvanceDeal(dealId: string, stage: string) {
    setAdvanceLoading((p) => ({ ...p, [dealId]: true }));
    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, stage })
      });
      const d = await res.json();
      showToast(res.ok, res.ok ? `Moved to ${stage}` : d.error ?? "Failed");
      if (res.ok) await fetchData();
    } catch { showToast(false, "Network error"); }
    setAdvanceLoading((p) => ({ ...p, [dealId]: false }));
  }

  async function handleFollowUp(id: string, action: "sent" | "skip") {
    try {
      await fetch("/api/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, followUpId: id })
      });
      await fetchData();
    } catch { /* ignore */ }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const reviewQueue = leads.filter((l) => l.human_review_required);
  const pendingNotifs = notifications.filter((n) => n.status === "pending");
  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const totalPipelineValue = openDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const notifCategories = ["all", ...Array.from(new Set(notifications.map((n) => n.category ?? "system")))];
  const filteredNotifs = notifFilter === "all" ? notifications : notifications.filter((n) => n.category === notifFilter);
  const visibleNotifs = expandedNotifs ? filteredNotifs : filteredNotifs.slice(0, 8);
  const scrapeSourceMeta = SCRAPER_SOURCES.find((s) => s.key === scraperSource);

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof Kanban; badge?: number }[] = [
    { key: "pipeline", label: "Pipeline", icon: Kanban,     badge: leads.length || undefined },
    { key: "scraper",  label: "Scraper",  icon: Globe },
    { key: "agents",   label: "Agents",   icon: Bot },
    { key: "deals",    label: "Deals",    icon: TrendingUp, badge: openDeals.length || undefined },
    { key: "activity", label: "Activity", icon: Activity,   badge: pendingNotifs.length || undefined },
  ];

  return (
    <div className="min-h-screen text-slate-100">

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Gridwise™</span>
            <span className="hidden text-xs text-slate-500 sm:inline">Earthana EESPL</span>
            <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 sm:inline">Live</span>
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === key ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {badge !== undefined && <span className="rounded-full bg-cyan-500/25 px-1.5 text-xs leading-4 text-cyan-200">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={fetchData} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); router.push("/login"); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/25">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {agentToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-xl ${agentToast.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {agentToast.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {agentToast.msg}
        </div>
      )}

      {/* Closer modal */}
      {closerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCloserData(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">Closer — Email Variants</h2>
                  {closerData.aiPowered && <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-300">AI powered</span>}
                </div>
                {closerData.reviewSignal?.requiresReview && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> {closerData.reviewSignal.reason}
                  </p>
                )}
              </div>
              <button onClick={() => setCloserData(null)} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white"><XCircle className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {closerData.variations?.map((v) => (
                <div key={v.id} className="rounded-xl border border-white/8 bg-slate-800/60 p-4">
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-300">{v.label ?? `Variation ${v.variation}`}</span>
                  <p className="mt-2 text-sm font-semibold text-white">{v.subject}</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-400">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-screen-2xl px-6 pb-16 pt-20">

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total Leads",    value: leads.length,                   icon: Users,       color: "text-cyan-300",   bg: "from-cyan-500/8 to-blue-500/8" },
            { label: "Review Queue",   value: reviewQueue.length,             icon: AlertTriangle, color: "text-amber-300",bg: "from-amber-500/8 to-orange-500/8" },
            { label: "Open Deals",     value: openDeals.length,               icon: GitBranch,   color: "text-indigo-300", bg: "from-indigo-500/8 to-purple-500/8" },
            { label: "Pipeline Value", value: formatINR(totalPipelineValue),  icon: IndianRupee, color: "text-emerald-300",bg: "from-emerald-500/8 to-green-500/8" },
            { label: "Due Follow-ups", value: pendingFollowUps.length,        icon: Clock,       color: "text-orange-300", bg: "from-orange-500/8 to-red-500/8" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border border-white/6 bg-gradient-to-br ${bg} p-4`}>
              <div className="flex items-start justify-between">
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                <Icon className={`h-4 w-4 ${color} opacity-70`} />
              </div>
              <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── PIPELINE TAB ────────────────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div className="space-y-5">
            {/* Lead Scout */}
            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15"><Search className="h-4 w-4 text-cyan-400" /></div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Lead Scout — Apollo.io + Claude AI</h2>
                  <p className="text-xs text-slate-500">Search Tamil Nadu industrial contacts by natural language</p>
                </div>
              </div>
              <form onSubmit={handleScout} className="flex gap-3">
                <input className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="e.g. Plant Manager Ambattur automotive, Coimbatore textile MD lean manufacturing…"
                  value={scoutQuery} onChange={(e) => setScoutQuery(e.target.value)} disabled={scoutLoading} />
                <button type="submit" disabled={scoutLoading || !scoutQuery.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 disabled:opacity-50">
                  {scoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                  {scoutLoading ? "Scouting…" : "Scout"}
                </button>
              </form>
              {scoutResult && (
                <div className={`mt-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${scoutResult.ok ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" : "border-red-500/25 bg-red-500/8 text-red-300"}`}>
                  {scoutResult.ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {scoutResult.message}
                </div>
              )}
            </section>

            {/* Human Review Queue */}
            {reviewQueue.length > 0 && (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Human Review Queue</h2>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">{reviewQueue.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {reviewQueue.map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-amber-500/15 bg-slate-900/60 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={lead.name} company={lead.company} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{lead.name ?? "Unknown"}</p>
                          <p className="truncate text-xs text-slate-400">{lead.company}{lead.email ? ` · ${lead.email}` : ""}</p>
                          {lead.review_reason && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300/80"><Shield className="h-3 w-3 shrink-0" /> {lead.review_reason}</p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <input className="flex-1 rounded-lg border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                              placeholder="Notes…" value={reviewNotes[lead.id] ?? ""}
                              onChange={(e) => setReviewNotes((p) => ({ ...p, [lead.id]: e.target.value }))} />
                            <button onClick={() => handleReview(lead.id, "approve")} disabled={reviewLoading[lead.id]}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50">
                              {reviewLoading[lead.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Approve
                            </button>
                            <button onClick={() => handleReview(lead.id, "reject")} disabled={reviewLoading[lead.id]}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50">
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

            {/* Kanban */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Kanban className="h-4 w-4 text-cyan-400" /> Lead Kanban</h2>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {PIPELINE_COLUMNS.map((col) => {
                  const colLeads = leads.filter((l) => (l.interest_status ?? "new") === col.key && !l.human_review_required);
                  return (
                    <div key={col.key} className={`min-w-[210px] shrink-0 rounded-2xl border ${col.color} p-3`}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{col.label}</p>
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{colLeads.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colLeads.slice(0, 8).map((lead) => (
                          <div key={lead.id} className="rounded-xl border border-white/6 bg-slate-900/60 p-3 hover:border-white/10">
                            <div className="flex items-start gap-2">
                              <Avatar name={lead.name} company={lead.company} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">{lead.name ?? "Unknown"}</p>
                                <p className="truncate text-xs text-slate-500">{lead.company ?? "—"}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button onClick={() => triggerAgent("closer", lead.id)} disabled={agentLoading[`closer-${lead.id}`]}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50">
                                {agentLoading[`closer-${lead.id}`] ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Zap className="h-2.5 w-2.5" />} Draft
                              </button>
                              {lead.email && (
                                <button onClick={() => triggerAgent("outbound", lead.id)} disabled={agentLoading[`outbound-${lead.id}`]}
                                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50">
                                  {agentLoading[`outbound-${lead.id}`] ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Mail className="h-2.5 w-2.5" />} Email
                                </button>
                              )}
                              {(lead.metadata as any)?.phone && (
                                <button onClick={() => triggerAgent("voice", lead.id)} disabled={agentLoading[`voice-${lead.id}`]}
                                  className="inline-flex items-center gap-1 rounded-lg bg-green-500/15 px-2 py-1 text-xs font-medium text-green-300 hover:bg-green-500/25 disabled:opacity-50">
                                  {agentLoading[`voice-${lead.id}`] ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Phone className="h-2.5 w-2.5" />} Call
                                </button>
                              )}
                            </div>
                            <p className="mt-1.5 text-right text-xs text-slate-700">{timeAgo(lead.updated_at)}</p>
                          </div>
                        ))}
                        {colLeads.length === 0 && <p className="py-4 text-center text-xs text-slate-700">Empty</p>}
                        {colLeads.length > 8 && <p className="text-center text-xs text-slate-600">+{colLeads.length - 8} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── SCRAPER TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "scraper" && (
          <div className="space-y-5">
            {/* Source selector + input */}
            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15"><Globe className="h-4 w-4 text-violet-400" /></div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Contact Scraper — Firecrawl + Apollo + Claude AI</h2>
                  <p className="text-xs text-slate-500">Discover decision-makers from websites, SIPCOT, IndiaMart, CII directories &amp; LinkedIn</p>
                </div>
              </div>

              {/* Source tabs */}
              <div className="mb-4 flex flex-wrap gap-2">
                {SCRAPER_SOURCES.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setScraperSource(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${scraperSource === key ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                    <Icon className="h-3 w-3" />{label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleScrape} className="space-y-3">
                <div className="flex gap-3">
                  <input className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                    placeholder={scrapeSourceMeta?.placeholder ?? "Enter URL or search query"}
                    value={scraperUrl} onChange={(e) => setScraperUrl(e.target.value)} disabled={scraperLoading} />
                  <button type="submit" disabled={scraperLoading || !scraperUrl.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:opacity-50">
                    {scraperLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {scraperLoading ? "Scraping…" : "Scrape & Analyse"}
                  </button>
                </div>
                <input className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  placeholder="Target titles (comma-separated, optional) — e.g. Plant Manager, Operations Head, MD"
                  value={scraperTitles} onChange={(e) => setScraperTitles(e.target.value)} disabled={scraperLoading} />
              </form>
            </section>

            {/* Analysis result */}
            {scrapeResult && (
              <div className="space-y-4">
                {/* Company analysis card */}
                {scrapeResult.analysis && (
                  <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-violet-400" />
                      <h3 className="text-sm font-semibold text-white">AI Company Analysis</h3>
                      <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">{scrapeResult.domain}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Company</p>
                        <p className="font-semibold text-white">{scrapeResult.analysis.companyName}</p>
                        <p className="text-xs text-slate-400">{scrapeResult.analysis.industry} · {scrapeResult.analysis.location}</p>
                        <p className="text-xs text-slate-500">{scrapeResult.analysis.employeeEstimate} employees</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Gridwise™ Fit</p>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2.5 flex-1 rounded-full bg-slate-700">
                            <div className={`h-2.5 rounded-full transition-all ${scrapeResult.analysis.gridwiseFit >= 70 ? "bg-emerald-500" : scrapeResult.analysis.gridwiseFit >= 40 ? "bg-cyan-500" : "bg-amber-500"}`}
                              style={{ width: `${scrapeResult.analysis.gridwiseFit}%` }} />
                          </div>
                          <span className="text-sm font-bold text-white">{scrapeResult.analysis.gridwiseFit}%</span>
                        </div>
                        <p className="text-xs text-slate-400">{scrapeResult.analysis.gridwiseFitReason}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Outreach Angle</p>
                        <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold capitalize text-cyan-300">{scrapeResult.analysis.outreachAngle}</span>
                        <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">Target Titles</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {scrapeResult.analysis.targetTitles.slice(0, 4).map((t) => (
                            <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Business Summary</p>
                        <p className="text-sm text-slate-300">{scrapeResult.analysis.businessSummary}</p>
                        {scrapeResult.analysis.painPoints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {scrapeResult.analysis.painPoints.map((p) => (
                              <span key={p} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Contacts table */}
                <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">Contacts Found</h3>
                      <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">{scrapeResult.contactsFound}</span>
                      {scrapeResult.savedCount > 0 && <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300">{scrapeResult.savedCount} already saved</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedContacts.size > 0 && (
                        <button onClick={saveSelectedContacts} disabled={savingContacts}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-50">
                          {savingContacts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          Save {selectedContacts.size} selected
                        </button>
                      )}
                      <button onClick={saveAllContacts} disabled={savingContacts}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                        {savingContacts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Save all to CRM
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-slate-500">
                          <th className="pb-3 pr-3 w-8"><input type="checkbox" className="rounded bg-slate-800"
                            checked={selectedContacts.size === scrapeResult.contacts.length && scrapeResult.contacts.length > 0}
                            onChange={(e) => setSelectedContacts(e.target.checked ? new Set(scrapeResult.contacts.map((c) => c.id)) : new Set())} /></th>
                          <th className="pb-3 pr-4">Name / Title</th>
                          <th className="pb-3 pr-4">Email</th>
                          <th className="pb-3 pr-4 hidden md:table-cell">Phone</th>
                          <th className="pb-3 pr-4">Source</th>
                          <th className="pb-3">AI Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {scrapeResult.contacts.map((c) => (
                          <tr key={c.id} className={`transition hover:bg-white/[0.02] ${selectedContacts.has(c.id) ? "bg-cyan-500/5" : ""}`}>
                            <td className="py-3 pr-3">
                              <input type="checkbox" className="rounded bg-slate-800"
                                checked={selectedContacts.has(c.id)} onChange={() => toggleContact(c.id)} />
                            </td>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-white">{c.name ?? <span className="text-slate-500">Unknown</span>}</p>
                              <p className="text-xs text-slate-500">{c.title ?? "—"}</p>
                            </td>
                            <td className="py-3 pr-4">
                              {c.email
                                ? <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-300">{c.email}</span>
                                : <span className="text-xs text-slate-600">—</span>}
                              {c.linkedin && (
                                <a href={c.linkedin} target="_blank" rel="noopener noreferrer"
                                  className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300">
                                  <Linkedin className="h-3 w-3" />
                                </a>
                              )}
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell">
                              <span className="text-xs text-slate-400">{c.phone ?? "—"}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                                {c.source.split(":")[0]}
                              </span>
                            </td>
                            <td className="py-3">
                              <ScoreBar score={c.aiScore ?? 50} />
                              <p className="mt-0.5 text-xs text-slate-600 max-w-[160px] truncate">{c.aiReasoning}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {/* Due follow-ups + scheduler */}
            <section className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <h3 className="text-sm font-semibold text-white">Outreach Scheduler</h3>
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">{pendingFollowUps.length} due</span>
                </div>
                <div className="flex items-center gap-2">
                  {schedulerResult && (
                    <span className="text-xs text-slate-400">{schedulerResult.succeeded} sent · {schedulerResult.failed} failed</span>
                  )}
                  <button onClick={runScheduler} disabled={schedulerLoading || pendingFollowUps.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50">
                    {schedulerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {schedulerLoading ? "Running…" : "Run Now"}
                  </button>
                </div>
              </div>
              {pendingFollowUps.length > 0 ? (
                <div className="space-y-2">
                  {pendingFollowUps.slice(0, 6).map((fu) => (
                    <div key={fu.id} className="flex items-center gap-3 rounded-xl border border-orange-500/15 bg-slate-900/50 px-4 py-3">
                      <span className="shrink-0 text-base">{fu.channel === "email" ? "📧" : fu.channel === "whatsapp" ? "💬" : "📞"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{fu.leads?.name ?? "Lead"} — {fu.leads?.company ?? "—"}</p>
                        <p className="truncate text-xs text-slate-500">{fu.subject ?? fu.message?.slice(0, 60)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-slate-600 hidden sm:inline">{timeAgo(fu.scheduled_at)}</span>
                        <button onClick={() => handleFollowUp(fu.id, "sent")} className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30">Sent</button>
                        <button onClick={() => handleFollowUp(fu.id, "skip")} className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-600">Skip</button>
                      </div>
                    </div>
                  ))}
                  {pendingFollowUps.length > 6 && <p className="text-center text-xs text-slate-600">+{pendingFollowUps.length - 6} more</p>}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-600">No follow-ups due — all caught up.</p>
              )}
            </section>
          </div>
        )}

        {/* ── AGENTS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "agents" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Bot className="h-4 w-4 text-cyan-400" /> Agent Fleet</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* Lead Scout */}
              <AgentCard title="Lead Scout" desc="Apollo.io + Claude AI scoring" icon={Search} color="cyan">
                <form onSubmit={handleScout} className="space-y-3">
                  <textarea rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="Describe target: industry, location, title, buying signals…"
                    value={scoutQuery} onChange={(e) => setScoutQuery(e.target.value)} disabled={scoutLoading} />
                  <button type="submit" disabled={scoutLoading || !scoutQuery.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-50">
                    {scoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                    {scoutLoading ? "Scouting…" : "Run Scout"}
                  </button>
                  {scoutResult && <p className={`text-xs ${scoutResult.ok ? "text-emerald-400" : "text-red-400"}`}>{scoutResult.message}</p>}
                </form>
              </AgentCard>

              {/* Closer */}
              <AgentCard title="Closer" desc="5 Claude AI email styles" icon={Zap} color="indigo">
                <div className="space-y-3">
                  <LeadSelect leads={leads} value={closerLeadId} onChange={setCloserLeadId} />
                  <input className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                    placeholder="Hook / angle (optional)" value={closerHook} onChange={(e) => setCloserHook(e.target.value)} />
                  <button disabled={!closerLeadId || agentLoading[`closer-${closerLeadId}`]}
                    onClick={() => triggerAgent("closer", closerLeadId, { hook: closerHook || undefined })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
                    {agentLoading[`closer-${closerLeadId}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {agentLoading[`closer-${closerLeadId}`] ? "Generating…" : "Generate Variants"}
                  </button>
                </div>
              </AgentCard>

              {/* Outbound */}
              <AgentCard title="Outbound" desc="AI email → deal → 4 follow-ups" icon={Send} color="emerald">
                <AgentLeadForm agentKey="outbound" leads={leads} agentLoading={agentLoading} agentForms={agentForms}
                  setAgentField={setAgentField} getAgentField={getAgentField}
                  onRun={(id) => triggerAgent("outbound", id, {
                    style: getAgentField("outbound", "style") || undefined,
                    hook: getAgentField("outbound", "hook") || undefined
                  })}
                  extraFields={[
                    { key: "style", label: "Email style", type: "select", options: [
                      { value: "", label: "Auto-detect" }, { value: "efficiency", label: "Cost Reduction" },
                      { value: "sustainability", label: "Net Zero" }, { value: "export", label: "Export Readiness" },
                      { value: "direct", label: "Short & Direct" }, { value: "wellbeing", label: "Biophilic" }
                    ]},
                    { key: "hook", label: "Hook", type: "text", placeholder: "e.g. recent SIPCOT expansion" }
                  ]}
                  buttonLabel="Send AI Email" buttonColor="emerald" />
              </AgentCard>

              {/* Voice — Retell AI */}
              <AgentCard title="Voice Call" desc="Retell AI conversational • Twilio fallback" icon={PhoneCall} color="green">
                <AgentLeadForm agentKey="voice" leads={leads} agentLoading={agentLoading} agentForms={agentForms}
                  setAgentField={setAgentField} getAgentField={getAgentField}
                  onRun={(id) => triggerAgent("voice", id)}
                  buttonLabel="Start AI Call" buttonColor="green" />
              </AgentCard>

              {/* Engagement */}
              <AgentCard title="Engagement" desc="WhatsApp via Twilio / WATI" icon={MessageSquare} color="teal">
                <AgentLeadForm agentKey="engagement" leads={leads} agentLoading={agentLoading} agentForms={agentForms}
                  setAgentField={setAgentField} getAgentField={getAgentField}
                  onRun={(id) => triggerAgent("engagement", id, {
                    channel: "whatsapp", event: "follow_up",
                    message: getAgentField("engagement", "message") || undefined
                  })}
                  extraFields={[{ key: "message", label: "Message", type: "textarea", placeholder: "Leave blank for AI-generated message" }]}
                  buttonLabel="Send WhatsApp" buttonColor="teal" />
              </AgentCard>

              {/* Researcher */}
              <AgentCard title="Researcher" desc="CRM enrichment + HubSpot sync" icon={BarChart3} color="blue">
                <AgentLeadForm agentKey="research" leads={leads} agentLoading={agentLoading} agentForms={agentForms}
                  setAgentField={setAgentField} getAgentField={getAgentField}
                  onRun={(id) => triggerAgent("research", id)}
                  buttonLabel="Run Research" buttonColor="blue" />
              </AgentCard>
            </div>
          </div>
        )}

        {/* ── DEALS TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === "deals" && (
          <div className="space-y-5">
            {dealStats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Total Deals", value: dealStats.total, icon: ListChecks, color: "text-slate-300" },
                  { label: "Pipeline Value", value: formatINR(dealStats.totalValue), icon: IndianRupee, color: "text-indigo-300" },
                  { label: "Won Revenue", value: formatINR(dealStats.wonValue), icon: TrendingUp, color: "text-emerald-300" },
                  { label: "Win Rate", value: dealStats.total > 0 ? `${Math.round(((dealStats.byStage["won"]?.count ?? 0) / dealStats.total) * 100)}%` : "—", icon: BarChart3, color: "text-cyan-300" }
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                      <Icon className={`h-4 w-4 ${color} opacity-70`} />
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            )}
            {dealStats && (
              <section className="rounded-2xl border border-white/6 bg-white/[0.03] p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><GitBranch className="h-4 w-4 text-cyan-400" /> Stage Funnel</h3>
                <div className="space-y-2">
                  {DEAL_STAGES.map((stage) => {
                    const info = dealStats.byStage[stage] ?? { count: 0, value: 0 };
                    const maxCount = Math.max(1, ...Object.values(dealStats.byStage).map((s) => s.count));
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <p className="w-24 shrink-0 text-right text-xs capitalize text-slate-400">{stage}</p>
                        <div className="flex-1 rounded-full bg-slate-800 h-2">
                          <div className={`h-2 rounded-full transition-all ${stage === "won" ? "bg-emerald-500" : stage === "lost" ? "bg-rose-500" : "bg-cyan-500"}`}
                            style={{ width: `${Math.round((info.count / maxCount) * 100)}%` }} />
                        </div>
                        <div className="flex w-28 items-center justify-between text-xs text-slate-400">
                          <span>{info.count}</span>
                          <span className="text-slate-600">{formatINR(info.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Building2 className="h-4 w-4 text-cyan-400" /> All Deals</h3>
              {deals.length > 0 ? (
                <div className="space-y-2">
                  {deals.map((deal) => {
                    const stageIdx = DEAL_STAGES.indexOf(deal.stage as any);
                    const nextStage = DEAL_STAGES[stageIdx + 1];
                    return (
                      <div key={deal.id} className="rounded-xl border border-white/6 bg-white/[0.03] p-4 hover:border-white/10">
                        <div className="flex flex-wrap items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{deal.leads?.company ?? "Unknown"}</p>
                              <StatusBadge status={deal.stage} />
                            </div>
                            <p className="text-xs text-slate-400">{deal.leads?.name ?? "—"}{deal.leads?.title ? ` · ${deal.leads.title}` : ""}</p>
                            {deal.notes && <p className="mt-1 text-xs italic text-slate-500">{deal.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-white tabular-nums">{formatINR(Number(deal.value ?? 0))}</p>
                            <p className="text-xs text-slate-500">{deal.probability}%</p>
                          </div>
                          {nextStage && deal.stage !== "won" && deal.stage !== "lost" && (
                            <button onClick={() => handleAdvanceDeal(deal.id, nextStage)} disabled={advanceLoading[deal.id]}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50">
                              {advanceLoading[deal.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              → {nextStage}
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-600">{timeAgo(deal.updated_at)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-14 text-center">
                  <TrendingUp className="h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">No deals yet. Send an outbound email to auto-create one.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── ACTIVITY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-cyan-400" /> Activity Feed
                {pendingNotifs.length > 0 && <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">{pendingNotifs.length}</span>}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {notifCategories.map((cat) => (
                  <button key={cat} onClick={() => setNotifFilter(cat)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${notifFilter === cat ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                    {cat === "all" ? "All" : cat.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {visibleNotifs.length > 0 ? visibleNotifs.map((n, i) => (
                <div key={n.id ?? i} className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 hover:border-white/10">
                  <span className="mt-0.5 shrink-0 text-base leading-none">{NOTIF_ICON[n.category ?? ""] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed text-slate-200">{n.message ?? "Event"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-800 px-1.5 py-0.5 uppercase tracking-wide text-slate-400">{n.category ?? "system"}</span>
                      <span>{timeAgo(n.created_at)}</span>
                      {n.status && n.status !== "pending" && (
                        <span className={`rounded-full px-1.5 py-0.5 ${n.status === "sent" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{n.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Bell className="h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">No activity yet</p>
                </div>
              )}
              {filteredNotifs.length > 8 && (
                <button onClick={() => setExpandedNotifs((p) => !p)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800/60 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200">
                  {expandedNotifs ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show {filteredNotifs.length - 8} more</>}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AgentCard({ title, desc, icon: Icon, color, children }: {
  title: string; desc: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/15 text-cyan-400", indigo: "bg-indigo-500/15 text-indigo-400",
    emerald: "bg-emerald-500/15 text-emerald-400", green: "bg-green-500/15 text-green-400",
    teal: "bg-teal-500/15 text-teal-400", blue: "bg-blue-500/15 text-blue-400"
  };
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[color] ?? colorMap.cyan}`}><Icon className="h-4 w-4" /></div>
        <div><p className="text-sm font-semibold text-white">{title}</p><p className="text-xs text-slate-500">{desc}</p></div>
      </div>
      {children}
    </div>
  );
}

function LeadSelect({ leads, value, onChange }: { leads: Lead[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50">
      <option value="">— Select a lead —</option>
      {leads.map((l) => <option key={l.id} value={l.id}>{l.name ?? "Unknown"}{l.company ? ` · ${l.company}` : ""}</option>)}
    </select>
  );
}

type ExtraField = { key: string; label: string; type: "text" | "select" | "textarea"; placeholder?: string; options?: { value: string; label: string }[] };

function AgentLeadForm({ agentKey, leads, agentLoading, agentForms, setAgentField, getAgentField, onRun, extraFields = [], buttonLabel, buttonColor }: {
  agentKey: string; leads: Lead[]; agentLoading: Record<string, boolean>;
  agentForms: Record<string, Record<string, string>>;
  setAgentField: (a: string, f: string, v: string) => void;
  getAgentField: (a: string, f: string) => string;
  onRun: (leadId: string) => void;
  extraFields?: ExtraField[]; buttonLabel: string; buttonColor: string;
}) {
  const leadId = getAgentField(agentKey, "leadId");
  const loading = agentLoading[`${agentKey}-${leadId}`] ?? false;
  const btnColor: Record<string, string> = {
    emerald: "bg-emerald-500 hover:bg-emerald-400", green: "bg-green-600 hover:bg-green-500",
    teal: "bg-teal-600 hover:bg-teal-500", blue: "bg-blue-600 hover:bg-blue-500",
    indigo: "bg-indigo-500 hover:bg-indigo-400"
  };
  return (
    <div className="space-y-3">
      <LeadSelect leads={leads} value={leadId} onChange={(v) => setAgentField(agentKey, "leadId", v)} />
      {extraFields.map((f) => f.type === "select" ? (
        <select key={f.key} value={getAgentField(agentKey, f.key)} onChange={(e) => setAgentField(agentKey, f.key, e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50">
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : f.type === "textarea" ? (
        <textarea key={f.key} rows={2} placeholder={f.placeholder ?? f.label} value={getAgentField(agentKey, f.key)}
          onChange={(e) => setAgentField(agentKey, f.key, e.target.value)}
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
      ) : (
        <input key={f.key} type="text" placeholder={f.placeholder ?? f.label} value={getAgentField(agentKey, f.key)}
          onChange={(e) => setAgentField(agentKey, f.key, e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
      ))}
      <button disabled={!leadId || loading} onClick={() => onRun(leadId)}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${btnColor[buttonColor] ?? "bg-cyan-500 hover:bg-cyan-400"}`}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {loading ? "Running…" : buttonLabel}
      </button>
    </div>
  );
}
