"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import PageLayout from "@/components/PageLayout";
import {
  useSentimentHistory,
  computeOverallScore,
  computeAvgSentiment,
  type HistoryItem,
} from "@/hooks/useSentimentHistory";

function getRecentTopics(items: HistoryItem[], topN = 3): string[] {
  if (items.length === 0) return ["—", "—", "—"];
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.query] = (counts[item.query] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([q]) => q);
}

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
          <span className="text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
            Skor Keseluruhan
          </span>
          <span className="text-lg font-black text-app-main dark:text-app-main">
            {items.length > 0 ? overallScore : "—"}
            {items.length > 0 && (
              <span className="text-sm font-normal text-app-muted">/100</span>
            )}
          </span>
        </div>
        {/* Stacked bar */}
        <div className="h-5 rounded-full overflow-hidden flex">
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
        <div className="flex gap-4 mt-2">
          {sentimentBars.map((b) => (
            <div key={b.key} className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${b.bg}`}
              />
              <span className="text-xs text-app-muted dark:text-app-muted">
                {b.label} <strong className="text-app-main dark:text-app-main">{b.key === "positive" ? pos : b.key === "neutral" ? neu : neg}%</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical bar chart */}
      {/* <div className="flex items-end gap-4 h-36">
        {sentimentBars.map((b) => {
          const val = b.key === "positive" ? pos : b.key === "neutral" ? neu : neg;
          const maxVal = Math.max(pos, neu, neg, 1);
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col-reverse">
                <div
                  className="w-full rounded-t-md transition-all flex items-end justify-center py-1"
                  style={{
                    height: `${Math.max((val / maxVal) * 100, 4)}%`,
                    backgroundColor: b.color,
                    minHeight: "4px",
                  }}
                >
                  <span className="text-xs font-black text-white drop-shadow-md leading-none pb-0.5">
                    {val}%
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-app-muted dark:text-app-muted">
                {b.label}
              </span>
            </div>
          );
        })}
      </div> */}

      {items.length > 1 && (
        <p className="text-xs text-app-muted dark:text-app-muted mt-3">
          Rata-rata dari {items.length} analisis
        </p>
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    openLoginModal,
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
      openLoginModal("search");
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const avgScore = computeAvgSentiment(items);
  const recentItems = items.slice(0, 5);
  const trendingTopics = getRecentTopics(items, 3);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      <Sidebar />
      <PageLayout>
        <div className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
          <TopBar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full">

              {/* Hero Section */}
              <section className="bg-app-bg dark:bg-app-surface-low rounded-xl p-16 text-center mb-12 border border-app-border-strong dark:border-app-border-strong">
                <div className="inline-flex px-3 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-xs font-bold uppercase tracking-wider mb-6">
                  AI-Powered Insights
                </div>
                <h1 className="text-5xl font-black tracking-tighter leading-tight text-app-main dark:text-app-main mb-6">
                  Analisis Sentimen Twitter
                  <br />
                  kurang dari 1 menit
                </h1>
                <p className="text-app-muted dark:text-app-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                  Dapatkan pemahaman mendalam tentang sentimen publik terhadap topik, brand, atau akun Twitter dalam hitungan detik dengan analisis bertenaga AI.
                </p>
                <div className="relative max-w-3xl mx-auto">
                  <div className="flex p-2 bg-app-surface-low dark:bg-app-surface-low rounded-xl border-2 border-app-border-strong dark:border-app-border-strong focus-within:border-app-primary dark:focus-within:border-app-primary transition-colors">
                    <div className="flex items-center px-2">
                      <MaterialIcon name="search" className="text-xl text-app-muted dark:text-app-muted" />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari topik, brand, atau akun Twitter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      className="flex-1 bg-transparent text-app-main dark:text-app-main text-base focus:outline-none placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60"
                    />
                    <button
                      onClick={handleSearch}
                      className="bg-app-primary dark:bg-app-primary hover:bg-app-primary dark:hover:bg-app-primary text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors"
                    >
                      Analisis
                    </button>
                  </div>
                </div>
                <p className="text-xs text-app-muted dark:text-app-muted mt-4">
                  {trendingTopics[0] !== "—" ? (
                    <>
                      Tren:{" "}
                      {trendingTopics.map((topic, i) => (
                        <span key={`hero-${i}`} className="font-medium">
                          {topic}
                          {i < trendingTopics.length - 1 && ", "}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span>Mulai analisis pertama Anda</span>
                  )}
                </p>
              </section>

              {/* Stats Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Total Analyses */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="monitoring" className="text-xl text-app-primary dark:text-app-primary" />
                    </div>
                  </div>
                  {statsLoading ? (
                    <div className="h-8 w-24 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mb-1" />
                  ) : statsError ? (
                    <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">—</p>
                  ) : (
                    <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                      {total.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-app-muted dark:text-app-muted font-medium">Total Analisis</p>
                </div>

                {/* Average Score */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="verified" className="text-xl text-app-primary dark:text-app-primary" />
                    </div>
                    <span className="px-2 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-muted dark:text-app-muted text-xs font-bold">
                      Rata-rata
                    </span>
                  </div>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                      {avgScore > 0 ? avgScore : "—"}{avgScore > 0 && <span className="text-lg font-normal text-app-muted">/100</span>}
                    </p>
                  )}
                  <p className="text-sm text-app-muted dark:text-app-muted font-medium">Avg. Overall Score</p>
                </div>

                {/* Trending Topics */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                      <MaterialIcon name="hub" className="text-xl text-app-primary dark:text-app-primary" />
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {statsLoading ? "" : "Live"}
                    </span>
                  </div>
                  <p className="text-xl font-black text-app-main dark:text-app-main tracking-tight mb-4">
                    Topik Tren
                  </p>
                  <div className="space-y-2">
                    {statsLoading
                      ? [1, 2, 3].map((i) => (
                          <div key={i} className="h-4 w-32 bg-app-surface-low dark:bg-app-surface-low rounded animate-pulse" />
                        ))
                      : trendingTopics.map((topic, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-app-main dark:text-app-main truncate">
                              {topic}
                            </span>
                          </div>
                        ))}
                  </div>
                </div>
              </section>

              {/* Bento Section */}
              <section className="grid grid-cols-12 gap-6 mb-12">
                {/* Left: Sentiment Overview */}
                <div className="col-span-8 bg-app-surface-low dark:bg-app-surface-low rounded-xl p-8 border border-app-border-strong dark:border-app-border-strong">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                        Ringkasan Sentimen
                      </h2>
                      <p className="text-sm text-app-muted dark:text-app-muted">
                        Distribusi rata-rata sentimen dari seluruh analisis Anda.
                      </p>
                    </div>
                    {items.length > 0 && (
                      <span className="px-2 py-1 rounded-full bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary text-xs font-bold">
                        {items.length} Analisis
                      </span>
                    )}
                  </div>
                  {statsLoading ? (
                    <div className="flex items-end gap-3 h-40 mt-4">
                      {[60, 30, 10].map((h, i) => (
                        <div key={i} className="flex-1 bg-app-surface-low dark:bg-app-surface-low rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  ) : items.length > 0 ? (
                    <SentimentBarChart items={items} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 mt-4 gap-2">
                      <MaterialIcon name="insights" className="text-4xl text-app-muted dark:text-app-muted opacity-40" />
                      <p className="text-sm text-app-muted dark:text-app-muted">Belum ada data. Mulai analisis pertama.</p>
                    </div>
                  )}
                </div>

                {/* Right: Quick Actions */}
                <div className="col-span-4 bg-primary dark:bg-primary rounded-xl p-8 flex flex-col justify-between">
                  <div>
                    <MaterialIcon name="auto_awesome" filled={1} className="text-3xl mb-4" />
                    <h2 className="text-xl font-black mb-2">Analisis Cepat</h2>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Lacak sentimen topik apa pun secara real-time dengan akurasi AI terbaru.
                    </p>
                  </div>
                  <button
                    onClick={handleSearch}
                    className="mt-6 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors"
                  >
                    Mulai Sekarang
                  </button>
                </div>
              </section>

              {/* Recent Analytics Table */}
              <section className="mt-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-app-main dark:text-app-main tracking-tight">Analisis Terbaru</h2>
                  <button
                    // onClick={() => router.push("/history")}
                    className="text-xs font-bold text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary transition-colors"
                  >
                    Lihat Semua Riwayat
                  </button>
                </div>

                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong overflow-hidden">
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-app-muted dark:text-app-muted">Memuat...</p>
                      </div>
                    </div>
                  ) : recentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <MaterialIcon name="history" className="text-4xl text-app-muted dark:text-app-muted opacity-40" />
                      <p className="text-sm text-app-muted dark:text-app-muted">Belum ada analisis. Mulai dari dashboard.</p>
                      <button
                        onClick={handleSearch}
                        className="mt-1 px-4 py-2 bg-app-primary text-white text-sm font-bold rounded-lg hover:opacity-90"
                      >
                        Mulai Analisis
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-app-surface-low/50 dark:bg-app-surface-low border-b border-app-border-strong dark:border-app-border-strong/20">
                          <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Keyword</th>
                          <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Sentimen Utama</th>
                          <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Volume</th>
                          <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">Skor</th>
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
                              <td className="px-6 py-4">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/search?q=${encodeURIComponent(item.query)}`,
                                    )
                                  }
                                  className="font-bold text-app-main dark:text-app-main hover:text-app-primary dark:hover:text-app-primary transition-colors text-left"
                                >
                                  {item.query}
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: primary.color }}
                                  />
                                  <span className="text-sm font-medium text-app-main dark:text-app-main">
                                    {primary.label}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-app-muted dark:text-app-muted font-medium">
                                {item.total.toLocaleString()} tweets
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${
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
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
