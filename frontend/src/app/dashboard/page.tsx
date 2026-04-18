"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar, { SidebarToggle } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import PageLayout from "@/components/PageLayout";
import {
  useSentimentHistory,
  computeOverallScore,
  computeAvgSentiment,
  type HistoryItem,
} from "@/hooks/useSentimentHistory";

function SentimentBarChart({ items }: { items: HistoryItem[] }) {
  const sentimentBars = [
    { label: "Positive", key: "positive" as const, color: "#22c55e", bg: "bg-emerald-500" },
    { label: "Neutral", key: "neutral" as const, color: "#eab308", bg: "bg-yellow-400" },
    { label: "Negative", key: "negative" as const, color: "#f87171", bg: "bg-red-400" },
  ];

  const pos = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.positivePct, 0) / items.length) : 0;
  const neu = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.neutralPct, 0) / items.length) : 0;
  const neg = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.negativePct, 0) / items.length) : 0;
  const overallScore =
    pos >= 50
      ? 65 + Math.round(pos / 3)
      : pos >= 25
      ? 40 + Math.round(pos / 2)
      : 20 + pos;

  return (
    <div className="mt-4 space-y-6">
      {/* Overall score + stacked bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
            Skor Keseluruhan
          </span>
          <span className="text-base sm:text-lg font-black text-app-main dark:text-app-main">
            {items.length > 0 ? overallScore : "—"}
            {items.length > 0 && (
              <span className="text-xs sm:text-sm font-normal text-app-muted">/100</span>
            )}
          </span>
        </div>
        {/* Stacked bar */}
        <div className="h-4 sm:h-5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${pos}%` }}
            title={`Positive: ${pos}%`}
          />
          <div
            className="bg-yellow-400 transition-all"
            style={{ width: `${neu}%` }}
            title={`Neutral: ${neu}%`}
          />
          <div
            className="bg-red-400 transition-all"
            style={{ width: `${neg}%` }}
            title={`Negative: ${neg}%`}
          />
        </div>
        {/* Legend */}
        <div className="flex gap-3 sm:gap-4 mt-2">
          {sentimentBars.map((b) => (
            <div key={b.key} className="flex items-center gap-1 sm:gap-1.5">
              <div
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${b.bg}`}
              />
              <span className="text-[10px] sm:text-xs text-app-muted dark:text-app-muted">
                {b.label} <strong className="text-app-main dark:text-app-main">{b.key === "positive" ? pos : b.key === "neutral" ? neu : neg}%</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <p className="text-[10px] sm:text-xs text-app-muted dark:text-app-muted mt-3">
          Rata-rata dari {items.length} analisis
        </p>
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    items,
    loading: statsLoading,
    error: statsError,
    total,
    fetchHistory,
  } = useSentimentHistory();

  const {
    isAuthenticated,
    pendingSearchQuery,
    setPendingSearchQuery,
    markPendingSearchExecuted,
  } = useAuthStore();

  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const lastProcessedRef = useRef<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && urlQuery) {
      setSearchQuery(urlQuery);
      setInitialized(true);
    }
  }, [initialized, urlQuery]);

  useEffect(() => {
    void fetchHistory(1);
  }, [fetchHistory]);

  useEffect(() => {
    if (
      isAuthenticated &&
      pendingSearchQuery &&
      pendingSearchQuery !== lastProcessedRef.current
    ) {
      const q = pendingSearchQuery;
      lastProcessedRef.current = q;
      markPendingSearchExecuted();
      setPendingSearchQuery(null);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }, [
    isAuthenticated,
    pendingSearchQuery,
    markPendingSearchExecuted,
    setPendingSearchQuery,
    router,
  ]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) {
      setPendingSearchQuery(searchQuery.trim());
      router.push("/login");
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const avgScore = computeAvgSentiment(items);
  const recentItems = items.slice(0, 5);
  const lastAnalysis = items[0] ?? null;

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Baru saja";
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h lalu`;
    const day = Math.floor(hr / 24);
    return `${day}d lalu`;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      {/* Mobile sidebar toggle */}
      <SidebarToggle onClick={() => setSidebarOpen(true)} />

      {/* Sidebar (responsive) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — margin adjusts per breakpoint */}
      <PageLayout>
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <TopBar onSidebarToggle={() => setSidebarOpen(true)} />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">

              {/* Hero Section */}
              <section className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl p-6 sm:p-10 lg:p-16 text-center mb-6 sm:mb-10 lg:mb-12 border border-app-border-strong dark:border-app-border-strong">
                <div className="inline-flex px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6">
                  AI-Powered Insights
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter leading-tight text-app-main dark:text-app-main mb-4 sm:mb-6">
                  Analisis Sentimen Twitter
                  <br />
                  <span className="text-app-primary dark:text-app-primary">kurang dari 1 menit</span>
                </h1>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-app-muted dark:text-app-muted max-w-xl lg:max-w-2xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed px-2">
                  Dapatkan pemahaman mendalam tentang sentimen publik terhadap topik, brand, atau akun Twitter dalam hitungan detik dengan analisis bertenaga AI.
                </p>
                <div className="relative max-w-xl lg:max-w-3xl mx-auto px-2 sm:px-0">
                  <div className="flex flex-col sm:flex-row p-1.5 sm:p-2 bg-app-surface-low dark:bg-app-surface-low rounded-lg sm:rounded-xl border-2 border-app-border-strong dark:border-app-border-strong focus-within:border-app-primary dark:focus-within:border-app-primary transition-colors gap-1 sm:gap-0">
                    <div className="flex items-center px-2 sm:px-3">
                      <MaterialIcon name="search" className="text-lg sm:text-xl text-app-muted dark:text-app-muted flex-shrink-0" />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari topik, brand, atau akun Twitter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      className="flex-1 bg-transparent text-app-main dark:text-app-main text-sm sm:text-base py-2 sm:py-3 focus:outline-none placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60"
                    />
                    <button
                      onClick={handleSearch}
                      className="bg-app-primary dark:bg-app-primary hover:bg-app-primary dark:hover:bg-app-primary text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap"
                    >
                      Analisis
                    </button>
                  </div>
                </div>
              </section>

              {/* Stats Grid */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
                {/* Total Analyses */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="monitoring" className="text-lg sm:text-xl text-app-primary dark:text-app-primary" />
                    </div>
                  </div>
                  {statsLoading ? (
                    <div className="h-7 sm:h-8 w-20 sm:w-24 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mb-1" />
                  ) : statsError ? (
                    <p className="text-2xl sm:text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">—</p>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                      {total.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted font-medium">Total Analisis</p>
                </div>

                {/* Average Score */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="verified" className="text-lg sm:text-xl text-app-primary dark:text-app-primary" />
                    </div>
                    <span className="px-2 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-muted dark:text-app-muted text-[10px] sm:text-xs font-bold">
                      Rata-rata
                    </span>
                  </div>
                  {statsLoading ? (
                    <div className="h-7 sm:h-8 w-14 sm:w-16 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-2xl sm:text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                      {avgScore > 0 ? avgScore : "—"}{avgScore > 0 && <span className="text-base sm:text-lg font-normal text-app-muted">/100</span>}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted font-medium">Avg. Overall Score</p>
                </div>

                {/* Last Analysis */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors sm:col-span-2 lg:col-span-1">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="history" className="text-lg sm:text-xl text-app-primary dark:text-app-primary" />
                    </div>
                  </div>
                  {statsLoading ? (
                    <>
                      <div className="h-5 sm:h-6 w-28 sm:w-32 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mb-1" />
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mt-1" />
                    </>
                  ) : lastAnalysis ? (
                    <>
                      <p className="text-base sm:text-lg font-black text-app-main dark:text-app-main tracking-tight mb-1 truncate">
                        {lastAnalysis.query}
                      </p>
                      <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted mb-2 sm:mb-3">
                        {timeAgo(lastAnalysis.createdAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                          {computeOverallScore(lastAnalysis.positivePct, lastAnalysis.negativePct, lastAnalysis.neutralPct)}
                        </span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400" />
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl sm:text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">—</p>
                      <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted font-medium">Belum ada analisis</p>
                    </>
                  )}
                  <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted font-medium mt-2">Analisis Terakhir</p>
                </div>
              </section>

              {/* Bento Section */}
              <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
                {/* Left: Sentiment Overview */}
                <div className="bg-app-surface-low dark:bg-app-surface-low rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-app-border-strong dark:border-app-border-strong">
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div>
                      <h2 className="text-base sm:text-lg lg:text-xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                        Ringkasan Sentimen
                      </h2>
                      <p className="text-[10px] sm:text-sm text-app-muted dark:text-app-muted">
                        Distribusi rata-rata sentimen dari seluruh analisis Anda.
                      </p>
                    </div>
                    {items.length > 0 && (
                      <span className="px-2 py-1 rounded-full bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary text-[10px] sm:text-xs font-bold whitespace-nowrap">
                        {items.length} Analisis
                      </span>
                    )}
                  </div>
                  {statsLoading ? (
                    <div className="flex items-end gap-3 h-28 sm:h-40 mt-4">
                      {[60, 30, 10].map((h, i) => (
                        <div key={i} className="flex-1 bg-app-surface-low dark:bg-app-surface-low rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  ) : items.length > 0 ? (
                    <SentimentBarChart items={items} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-28 sm:h-40 mt-4 gap-2">
                      <MaterialIcon name="insights" className="text-3xl sm:text-4xl text-app-muted dark:text-app-muted opacity-40" />
                      <p className="text-[10px] sm:text-sm text-app-muted dark:text-app-muted">Belum ada data. Mulai analisis pertama.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Recent Analytics Table */}
              <section className="mt-6 sm:mt-10 lg:mt-12">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h2 className="text-base sm:text-lg font-black text-app-main dark:text-app-main tracking-tight">Analisis Terbaru</h2>
                  <button
                    onClick={() => router.push("/history")}
                    className="text-[10px] sm:text-xs font-bold text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary transition-colors whitespace-nowrap"
                  >
                    Lihat Semua Riwayat
                  </button>
                </div>

                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl border border-app-border-strong dark:border-app-border-strong overflow-hidden">
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted">Memuat...</p>
                      </div>
                    </div>
                  ) : recentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 gap-3">
                      <MaterialIcon name="history" className="text-3xl sm:text-4xl text-app-muted dark:text-app-muted opacity-40" />
                      <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted">Belum ada analisis. Mulai dari dashboard.</p>
                      <button
                        onClick={handleSearch}
                        className="mt-1 px-4 py-2 bg-app-primary text-white text-xs sm:text-sm font-bold rounded-lg hover:opacity-90"
                      >
                        Mulai Analisis
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px]">
                        <thead>
                          <tr className="bg-app-surface-low/50 dark:bg-app-surface-low border-b border-app-border-strong dark:border-app-border-strong/20">
                            <th className="text-start px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Keyword</th>
                            <th className="text-start px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted hidden sm:table-cell">Sentimen</th>
                            <th className="text-start px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted hidden md:table-cell">Volume</th>
                            <th className="text-start px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Skor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentItems.map((item, idx) => {
                            const score = computeOverallScore(
                              item.positivePct,
                              item.negativePct,
                              item.neutralPct,
                            );
                            const primary =
                              item.positivePct >= item.negativePct &&
                              item.positivePct >= item.neutralPct
                                ? { label: `Positive (${item.positivePct}%)`, color: "#22c55e" }
                                : item.neutralPct >= item.negativePct
                                ? { label: `Neutral (${item.neutralPct}%)`, color: "#eab308" }
                                : { label: `Negative (${item.negativePct}%)`, color: "#f87171" };

                            return (
                              <tr
                                key={item.jobId}
                                className={`hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors ${
                                  idx < recentItems.length - 1
                                    ? "border-b border-slate-100 dark:border-app-border-strong/20"
                                    : ""
                                }`}
                              >
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/search?q=${encodeURIComponent(item.query)}`,
                                      )
                                    }
                                    className="font-bold text-app-main dark:text-app-main hover:text-app-primary dark:hover:text-app-primary transition-colors text-left text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none"
                                  >
                                    {item.query}
                                  </button>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <span
                                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: primary.color }}
                                    />
                                    <span className="text-xs sm:text-sm font-medium text-app-main dark:text-app-main whitespace-nowrap">
                                      {primary.label}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-app-muted dark:text-app-muted font-medium hidden md:table-cell">
                                  {item.total.toLocaleString()} tweets
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black border whitespace-nowrap ${
                                      score >= 70
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                                        : score >= 40
                                        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                                        : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50"
                                    }`}
                                  >
                                    {score}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}