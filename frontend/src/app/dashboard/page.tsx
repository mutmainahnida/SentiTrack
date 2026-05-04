"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar, { SidebarToggle } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  useSentimentHistory,
  computeOverallScore,
  computeAvgSentiment,
  computePeakHour,
  type HistoryItem,
} from "@/hooks/useSentimentHistory";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/* ── Chart colors ──────────────────────────────────────── */
const CHART_POSITIVE = "#22D3EE";
const CHART_NEUTRAL  = "#818CF8";
const CHART_NEGATIVE = "#FB7185";
const CHART_MINT     = "#34D399";
const CHART_BG_LIGHT = "rgba(255,255,255,0.05)";
const CHART_BG_DARK  = "rgba(11,17,32,0.7)";

/* ── Custom recharts tooltip ────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-[var(--text-main)] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="capitalize">{p.name}</span>
          <strong className="text-[var(--text-main)]">{p.value}%</strong>
        </div>
      ))}
    </div>
  );
}

/* ── Sentiment Trend Chart (Line + Area) ────────────────── */
function SentimentTrendChart({ items }: { items: HistoryItem[] }) {
  const chartData = [...items].reverse().slice(-14).map((item) => {
    const date = new Date(item.createdAt);
    const label = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    return {
      name:    label,
      positive: item.positivePct,
      neutral:  item.neutralPct,
      negative: item.negativePct,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <svg className="w-10 h-10 text-[var(--text-muted)] opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Belum ada data trend. Analisis pertama Anda akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_POSITIVE} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_POSITIVE} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_NEUTRAL} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_NEUTRAL} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_NEGATIVE} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_NEGATIVE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="positive" name="Positive" stroke={CHART_POSITIVE} fill="url(#gradPos)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="neutral" name="Neutral" stroke={CHART_NEUTRAL} fill="url(#gradNeu)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="negative" name="Negative" stroke={CHART_NEGATIVE} fill="url(#gradNeg)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Sentiment Distribution Donut ───────────────────────── */
function SentimentDonutChart({ items }: { items: HistoryItem[] }) {
  const avgPos = items.length ? Math.round(items.reduce((s, i) => s + i.positivePct, 0) / items.length) : 0;
  const avgNeu = items.length ? Math.round(items.reduce((s, i) => s + i.neutralPct, 0) / items.length) : 0;
  const avgNeg = items.length ? Math.round(items.reduce((s, i) => s + i.negativePct, 0) / items.length) : 0;

  const data = [
    { name: "Positive", value: avgPos, color: CHART_POSITIVE },
    { name: "Neutral",  value: avgNeu, color: CHART_NEUTRAL  },
    { name: "Negative", value: avgNeg, color: CHART_NEGATIVE },
  ];

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-3">
        <svg className="w-10 h-10 text-[var(--text-muted)] opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Tidak ada data distribusi.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-[var(--text-main)]">{items.length}</span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Analisis</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">{d.name}</span>
                <span className="text-sm font-bold text-[var(--text-main)]">{d.value}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: d.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${d.value}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analysis Count Chart ─────────────────────────────── */
function VolumeChart({ items }: { items: HistoryItem[] }) {
  // Group by day and count analyses
  const dayMap: Record<string, number> = {};
  for (const item of [...items].reverse()) {
    const d = new Date(item.createdAt);
    const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    dayMap[key] = (dayMap[key] ?? 0) + 1;
  }
  const chartData = Object.entries(dayMap).slice(-14).map(([name, count]) => ({ name, count }));

  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <svg className="w-8 h-8 text-[var(--text-muted)] opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Tidak ada data aktivitas.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="count" name="Analisis" stroke={CHART_MINT} strokeWidth={2.5}
          dot={{ fill: CHART_MINT, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Backend Status Panel ─────────────────────────────── */
function BackendStatus({ backendUrl }: { backendUrl: string }) {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(3000) });
        setLatency(Date.now() - start);
        setStatus(res.ok ? "online" : "offline");
      } catch {
        setLatency(null);
        setStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const color = status === "online" ? CHART_MINT : status === "offline" ? CHART_NEGATIVE : CHART_NEUTRAL;
  const label = status === "online" ? `Online · ${latency}ms` : status === "offline" ? "Offline" : "Checking...";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <motion.span
          animate={status === "online" ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: status === "online" ? 2 : 0, repeat: Infinity }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="h-4 w-px bg-[var(--border)]" />
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span className="text-xs text-[var(--text-muted)] font-mono">API {new URL(backendUrl).hostname}</span>
      </div>
    </div>
  );
}

/* ── Stat mini card ────────────────────────────────────── */
function MiniStat({ icon, label, value, accent = CHART_POSITIVE }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-300 group"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black text-[var(--text-main)] tracking-tight leading-none mb-1">{value}</div>
        <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      </div>
    </motion.div>
  );
}

/* ── Dashboard ──────────────────────────────────────────── */
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { items, loading: statsLoading, total, fetchHistory } = useSentimentHistory();
  const { isAuthenticated, pendingSearchQuery, setPendingSearchQuery, markPendingSearchExecuted } = useAuthStore();

  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const lastProcessedRef = useRef<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && urlQuery) { setSearchQuery(urlQuery); setInitialized(true); }
  }, [initialized, urlQuery]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (isAuthenticated && pendingSearchQuery && pendingSearchQuery !== lastProcessedRef.current) {
      const q = pendingSearchQuery;
      lastProcessedRef.current = q;
      markPendingSearchExecuted();
      setPendingSearchQuery(null);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }, [isAuthenticated, pendingSearchQuery, markPendingSearchExecuted, setPendingSearchQuery, router]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) { setPendingSearchQuery(searchQuery.trim()); router.push("/login"); }
    else { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); }
  };

  const avgScore  = computeAvgSentiment(items);
  const peakHour   = computePeakHour(items);
  const lastItem   = items[0] ?? null;
  const avgPos     = items.length ? Math.round(items.reduce((s, i) => s + i.positivePct, 0) / items.length) : 0;
  const avgNeg     = items.length ? Math.round(items.reduce((s, i) => s + i.negativePct, 0) / items.length) : 0;
  const avgNeu     = items.length ? Math.round(items.reduce((s, i) => s + i.neutralPct, 0) / items.length) : 0;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Baru saja";
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h lalu`;
    return `${Math.floor(hr / 24)}d lalu`;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <PageLayout>
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
          <TopBar onSidebarToggle={() => setSidebarOpen(true)} />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">

              {/* ── Header: Title + Search + Backend Status ─────── */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black font-display text-[var(--text-main)] tracking-tight">Neural Dashboard</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Real-time sentiment dari keyword yang Anda cari.</p>
                </div>
                {/* Quick search */}
                <div className="flex items-center gap-3">
                  <BackendStatus backendUrl={BACKEND_API} />
                  <div className="relative rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] overflow-hidden flex items-center focus-within:border-[var(--primary)] transition-colors">
                    <svg className="w-4 h-4 ml-4 text-[var(--text-muted)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <Input
                      type="text"
                      placeholder="Analisis topik baru..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm p-2.5 h-9 w-52"
                    />
                    <Button size="sm" onClick={handleSearch} className="mr-1.5 h-7 px-4 rounded-lg text-xs font-bold">
                      Analisis
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── KPI Stats Row ──────────────────────────────── */}
              <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" variants={containerVariants} initial="hidden" animate="visible">
                <MiniStat
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
                  label="Total Analisis"
                  value={statsLoading ? <Skeleton className="h-7 w-16" /> : total.toLocaleString()}
                  accent={CHART_POSITIVE}
                />
                <MiniStat
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
                  label="Avg. Skor Sentimen"
                  value={avgScore > 0 ? avgScore : "—"}
                  accent={CHART_MINT}
                />
                <MiniStat
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                  label="Peak Activity"
                  value={peakHour}
                  accent={CHART_NEUTRAL}
                />
                <MiniStat
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                  label="Tweet Terakhir"
                  value={lastItem ? `${lastItem.total.toLocaleString()} tw` : "—"}
                  accent={CHART_NEGATIVE}
                />
              </motion.div>

              {/* ── Bento Charts Grid ──────────────────────────── */}
              <div className="grid grid-cols-12 gap-4 mb-6">

                {/* Sentiment Trend — spans 8 cols */}
                <motion.div
                  className="col-span-12 lg:col-span-8"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                >
                  <Card className="bg-[var(--surface)] border border-[var(--border)] h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-[var(--text-main)]">Sentimen Trend — 14 Hari Terakhir</CardTitle>
                        <Badge className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                          style={{ background: `${CHART_POSITIVE}15`, color: CHART_POSITIVE, border: `1px solid ${CHART_POSITIVE}30` }}>
                          Live
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? <Skeleton className="h-56 w-full rounded-xl" /> : <SentimentTrendChart items={items} />}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Sentiment Distribution — spans 4 cols */}
                <motion.div
                  className="col-span-12 lg:col-span-4"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                >
                  <Card className="bg-[var(--surface)] border border-[var(--border)] h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-[var(--text-main)]">Distribusi Sentimen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? <Skeleton className="h-52 w-full rounded-xl" /> : <SentimentDonutChart items={items} />}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Volume Chart — spans 6 cols */}
                <motion.div
                  className="col-span-12 lg:col-span-6"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                >
                  <Card className="bg-[var(--surface)] border border-[var(--border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-[var(--text-main)]">Analisis per Hari — 14 Hari Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : <VolumeChart items={items} />}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Sentiment Breakdown — spans 6 cols */}
                <motion.div
                  className="col-span-12 lg:col-span-6"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                >
                  <Card className="bg-[var(--surface)] border border-[var(--border)] h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-[var(--text-main)]">Ringkasan Rata-rata</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                          <p className="text-sm text-[var(--text-muted)]">Mulai analisis untuk melihat ringkasan.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {[
                            { label: "Positive", value: avgPos, color: CHART_POSITIVE },
                            { label: "Neutral",  value: avgNeu, color: CHART_NEUTRAL  },
                            { label: "Negative", value: avgNeg, color: CHART_NEGATIVE },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-[var(--text-muted)] w-20">{item.label}</span>
                              <div className="flex-1 h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.value}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                              <span className="text-sm font-bold text-[var(--text-main)] w-10 text-right">{item.value}%</span>
                            </div>
                          ))}
                          <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                            Rata-rata dari <strong className="text-[var(--text-main)]">{items.length}</strong> analisis yang tercatat.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Recent Analytics Table ───────────────────────── */}
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                  <CardHeader className="border-b border-[var(--border)] pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-[var(--text-main)]">Riwayat Analisis</CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs text-[var(--text-muted)] font-medium"
                        onClick={() => router.push("/history")}>
                        Lihat Semua →
                      </Button>
                    </div>
                  </CardHeader>
                  <AnimatePresence mode="wait">
                    {statsLoading ? (
                      <CardContent className="p-6 space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                      </CardContent>
                    ) : items.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
                        <svg className="w-12 h-12 text-[var(--text-muted)] opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <p className="text-sm text-[var(--text-muted)]">Belum ada analisis. Mulai dengan mencari topik.</p>
                        <Button size="sm" onClick={handleSearch} className="font-bold">Mulai Analisis</Button>
                      </motion.div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              {["Keyword", "Sentimen Utama", "Volume", "Skor", "Waktu"].map((h) => (
                                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
                              {items.slice(0, 8).map((item, idx) => {
                                const score = computeOverallScore(item.positivePct, item.negativePct, item.neutralPct);
                                const primary = item.positivePct >= item.negativePct && item.positivePct >= item.neutralPct
                                  ? { label: "Positive", color: CHART_POSITIVE }
                                  : item.neutralPct >= item.negativePct
                                  ? { label: "Neutral", color: CHART_NEUTRAL }
                                  : { label: "Negative", color: CHART_NEGATIVE };

                                return (
                                  <motion.tr
                                    key={item.jobId}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="border-b border-[var(--border)]/40 hover:bg-[var(--border)]/10 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                                  >
                                    <td className="px-5 py-4">
                                      <span className="text-sm font-bold text-[var(--text-main)]">{item.query}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary.color }} />
                                        <span className="text-sm font-medium text-[var(--text-main)]">{primary.label}</span>
                                        <span className="text-xs text-[var(--text-muted)]">({item.positivePct > item.neutralPct ? item.positivePct : item.neutralPct > item.negativePct ? item.neutralPct : item.negativePct}%)</span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-[var(--text-muted)] font-medium">{item.total.toLocaleString()} tw</td>
                                    <td className="px-5 py-4">
                                      <Badge
                                        className="text-xs font-bold border-0"
                                        style={score >= 70 ? { background: `${CHART_MINT}20`, color: CHART_MINT }
                                          : score >= 40 ? { background: `${CHART_NEUTRAL}20`, color: CHART_NEUTRAL }
                                          : { background: `${CHART_NEGATIVE}20`, color: CHART_NEGATIVE }}
                                      >{score}</Badge>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-[var(--text-muted)]">{timeAgo(item.createdAt)}</td>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.section>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}