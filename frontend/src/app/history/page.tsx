"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar, { SidebarToggle } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { IconByName } from "@/components/ReactIcon";
import { FaSearch, FaDownload, FaExclamationCircle, FaHistory, FaEye, FaSyncAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PageLayout from "@/components/PageLayout";
import {
  useSentimentHistory,
  computeOverallScore,
  computeAvgSentiment,
  computePeakHour,
} from "@/hooks/useSentimentHistory";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function SentimentDots({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="flex gap-1">
        <div
          className="w-2.5 h-2.5 rounded-full bg-emerald-500"
          title={`Positive: ${positive}%`}
        />
        <div
          className="w-2.5 h-2.5 rounded-full bg-yellow-400"
          title={`Neutral: ${neutral}%`}
        />
        <div
          className="w-2.5 h-2.5 rounded-full bg-rose-500"
          title={`Negative: ${negative}%`}
        />
      </div>
      <span className="text-xs text-app-muted dark:text-app-muted">
        {positive + negative + neutral > 0 ? `${positive}/${neutral}/${negative}` : "—"}
      </span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label =
    score >= 70 ? "Positive" : score >= 40 ? "Mixed" : "Negative";
  const cls =
    score >= 70
      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
      : score >= 40
      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
      : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${cls}`}>
      {score}
    </span>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { items, loading, error, page, totalPages, total, filter, setFilter, fetchHistory, setPage } =
    useSentimentHistory();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) void fetchHistory(1);
  }, [isAuthenticated, fetchHistory]);

  if (!isAuthenticated) return null;

  const avgScore = computeAvgSentiment(items);
  const peakHour = computePeakHour(items);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <PageLayout>
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
          <TopBar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-8">

              {/* Stats Bento */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Total Scans */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl border border-app-border-strong dark:border-app-border-strong p-4 sm:p-6 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Total Scans</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-app-main dark:text-app-main">{total.toLocaleString()}</span>
                    <span className="text-emerald-500 text-[10px] sm:text-xs font-bold mb-1">analisis</span>
                  </div>
                </div>

                {/* Avg. Sentiment */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl border border-app-border-strong dark:border-app-border-strong p-4 sm:p-6 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Avg. Overall Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-app-main dark:text-app-main">{avgScore}</span>
                    <span className="text-app-muted text-[10px] sm:text-xs font-bold mb-1">/ 100</span>
                  </div>
                  {avgScore > 0 && (
                    <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 bg-app-surface-low dark:bg-app-surface-lowest rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${avgScore}%`,
                          backgroundColor:
                            avgScore >= 70 ? "#22c55e" : avgScore >= 40 ? "#3b82f6" : "#f87171",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Peak Hour */}
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl border border-app-border-strong dark:border-app-border-strong p-4 sm:p-6 shadow-sm sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Peak Hour (WIB)</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-app-main dark:text-app-main">{peakHour}</span>
                    <span className="text-app-muted text-[10px] sm:text-xs font-bold mb-1">UTC+7</span>
                  </div>
                </div>
              </section>

              {/* Search History Table */}
              <section className="bg-app-bg dark:bg-app-surface-low rounded-xl sm:rounded-2xl border border-app-border-strong dark:border-app-border-strong shadow-sm overflow-hidden flex-1">
                {/* Table header controls */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-app-border-strong">
                  <div className="relative w-72">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted text-lg" />
                    <input
                      type="text"
                      placeholder="Cari riwayat..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="w-full h-8 sm:h-9 pl-8 sm:pl-9 pr-3 sm:pr-4 rounded-lg bg-app-surface-low dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main placeholder:text-app-muted dark:placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-primary/20 dark:focus:ring-app-primary/20 text-xs sm:text-sm"
                    />
                  </div>
                  <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-app-bg dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors text-sm">
                    <FaDownload className="text-base" />
                    Export CSV
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 sm:py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted">Memuat riwayat...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <FaExclamationCircle className="text-4xl text-red-500" />
                      <p className="text-sm text-app-muted dark:text-app-muted">{error}</p>
                      <button
                        onClick={() => void fetchHistory(page)}
                        className="px-4 py-2 bg-app-primary text-white text-xs sm:text-sm font-bold rounded-lg hover:opacity-90"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <FaHistory className="text-5xl text-app-muted dark:text-app-muted opacity-40" />
                      <p className="text-sm text-app-muted dark:text-app-muted">
                        {filter ? "Tidak ada hasil untuk filter tersebut." : "Belum ada riwayat analisis."}
                      </p>
                      {!filter && (
                        <button
                          onClick={() => router.push("/dashboard")}
                          className="mt-2 px-4 py-2 bg-app-primary text-white text-sm font-bold rounded-lg hover:opacity-90"
                        >
                          Mulai Analisis
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="bg-app-surface-low/50 dark:bg-app-surface-low border-b border-app-border-strong dark:border-app-border-strong">
                          <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">Keyword</th>
                          <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide hidden sm:table-cell">Tanggal / Waktu</th>
                          <th className="text-center px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide hidden md:table-cell">Sentiment Mix</th>
                          <th className="text-center px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">Skor</th>
                          <th className="text-center px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-app-surface-container">
                        {items.map((item) => {
                          const score = computeOverallScore(item.positivePct, item.negativePct, item.neutralPct);
                          return (
                            <tr
                              key={item.jobId}
                              className="hover:bg-app-surface-low/80 dark:hover:bg-app-surface-low transition-colors group"
                            >
                              <td className="px-3 sm:px-6 py-3 sm:py-5">
                                <button
                                  onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                                  className="text-xs sm:text-sm font-bold text-app-main dark:text-app-main hover:text-app-primary dark:hover:text-app-primary transition-colors text-left truncate max-w-[100px] sm:max-w-none"
                                >
                                  {item.query}
                                </button>
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-5 hidden sm:table-cell">
                                <div className="text-[10px] sm:text-sm text-app-muted dark:text-app-muted font-medium">
                                  {formatDate(item.createdAt)}
                                </div>
                                <div className="text-[9px] sm:text-xs text-app-muted dark:text-app-muted opacity-70">
                                  {formatTime(item.createdAt)}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-5 hidden md:table-cell">
                                <SentimentDots
                                  positive={item.positivePct}
                                  negative={item.negativePct}
                                  neutral={item.neutralPct}
                                />
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-5">
                                <div className="flex items-center justify-center">
                                  <ScoreBadge score={score} />
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-5">
                                <div className="flex items-center justify-center gap-1 transition-opacity">
                                  <button
                                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                                    className="p-1 sm:p-1.5 rounded-md text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors"
                                    title="Lihat"
                                  >
                                    <FaEye className="text-base" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                                    className="p-1 sm:p-1.5 rounded-md text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors"
                                    title="Analisis Ulang"
                                  >
                                    <FaSyncAlt className="text-base" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>

                {/* Pagination footer */}
                {!loading && items.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-100 dark:border-app-border-strong">
                    <p className="text-[10px] sm:text-xs text-app-muted dark:text-app-muted">
                      Hal. {page} dari {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} hasil
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (page > 1) void fetchHistory(page - 1);
                        }}
                        disabled={page <= 1}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FaChevronLeft className="text-base" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => void fetchHistory(pageNum)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-[10px] sm:text-sm font-medium transition-colors ${
                              page === pageNum
                                ? "bg-app-primary dark:bg-app-primary text-white"
                                : "border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          if (page < totalPages) void fetchHistory(page + 1);
                        }}
                        disabled={page >= totalPages}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FaChevronRight className="text-base" />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Footer */}
              <footer className="mt-auto pt-4 sm:pt-6 pb-2 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-app-muted dark:text-app-muted border-t border-app-border-strong dark:border-app-border-strong">
                <span>© 2026 SentiTrack</span>
                <div className="flex gap-3 sm:gap-6">
                  <a href="#" className="hover:text-app-primary dark:hover:text-app-primary transition-colors">System Status</a>
                  <a href="#" className="hover:text-app-primary dark:hover:text-app-primary transition-colors">Privacy Protocol</a>
                  <a href="#" className="hover:text-app-primary dark:hover:text-app-primary transition-colors">Security Center</a>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}
