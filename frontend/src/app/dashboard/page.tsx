"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar, { SidebarToggle } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { IconByName } from "@/components/ReactIcon";
import { FaSearch, FaChartLine, FaArrowRight, FaChartBar } from "react-icons/fa";
import { FiTrendingUp, FiRotateCw } from "react-icons/fi";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-app-muted uppercase tracking-wider">
            Skor Keseluruhan
          </span>
          <motion.span
            key={overallScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-black text-app-main"
          >
            {items.length > 0 ? overallScore : "—"}
            {items.length > 0 && (
              <span className="text-sm font-normal text-app-muted ml-1">/100</span>
            )}
          </motion.span>
        </div>
        {/* Stacked bar */}
        <div className="h-5 rounded-full overflow-hidden flex">
          <motion.div
            className="bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pos}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="bg-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${neu}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
          <motion.div
            className="bg-red-400"
            initial={{ width: 0 }}
            animate={{ width: `${neg}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {sentimentBars.map((b, i) => {
            const val = b.key === "positive" ? pos : b.key === "neutral" ? neu : neg;
            return (
              <motion.div
                key={b.key}
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${b.bg}`} />
                <span className="text-xs text-app-muted">
                  {b.label} <strong className="text-app-main">{val}%</strong>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {items.length > 1 && (
        <p className="text-xs text-app-muted">
          Rata-rata dari {items.length} analisis
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, delay = 0 }: { icon: React.ReactNode; label: string; value: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="group bg-white/80 dark:bg-app-surface/80 backdrop-blur-sm border-app-border hover:border-app-primary/50 transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary/20 to-blue-400/20 flex items-center justify-center text-app-primary"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {icon}
            </motion.div>
          </div>
          <div className="text-3xl font-black text-app-main tracking-tight mb-1">
            {value}
          </div>
          <p className="text-sm text-app-muted font-medium">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-app-bg to-app-surface-low/50 dark:from-app-bg dark:to-app-surface/50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <PageLayout>
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
          <TopBar onSidebarToggle={() => setSidebarOpen(true)} />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">

              {/* Hero Section */}
              <motion.section
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/90 to-blue-50/50 dark:from-app-surface/90 dark:to-app-primary/5 rounded-2xl p-10 text-center mb-8 backdrop-blur-sm border border-app-border shadow-lg shadow-app-primary/5"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-app-primary/10 text-app-primary text-xs font-bold uppercase tracking-wider mb-6"
                >
                  <FiTrendingUp className="h-3 w-3" />
                  AI-Powered Insights
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-black tracking-tight text-app-main mb-4"
                >
                  Analisis Sentimen Twitter
                  <br />
                  <span className="bg-gradient-to-r from-app-primary to-blue-500 bg-clip-text text-transparent">kurang dari 1 menit</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-app-muted text-lg max-w-2xl mx-auto mb-8"
                >
                  Dapatkan pemahaman mendalam tentang sentimen publik terhadap topik, brand, atau akun Twitter dalam hitungan detik.
                </motion.p>

                {/* Search bar */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-xl mx-auto"
                >
                  <Card className="p-1.5 bg-white dark:bg-app-surface border-app-border shadow-xl">
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <div className="flex items-center px-4 flex-1 gap-3">
                        <FaSearch className="text-app-muted" />
                        <Input
                          type="text"
                          placeholder="Cari topik, brand, atau akun Twitter..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <Button onClick={handleSearch} className="gap-2">
                        Analisis <FaArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </motion.section>

              {/* Stats Grid */}
              <motion.section
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <StatCard
                  icon={<FaChartBar className="h-5 w-5" />}
                  label="Total Analisis"
                  value={statsLoading ? <Skeleton className="h-8 w-20" /> : total.toLocaleString()}
                  delay={0.1}
                />
                <StatCard
                  icon={<FiTrendingUp className="h-5 w-5" />}
                  label="Avg. Overall Score"
                  value={avgScore > 0 ? avgScore : "—"}
                  delay={0.2}
                />
                <StatCard
                  icon={<FiRotateCw className="h-5 w-5" />}
                  label="Analisis Terakhir"
                  value={lastAnalysis ? (
                    <span className="text-lg truncate">{lastAnalysis.query}</span>
                  ) : "—"}
                  delay={0.3}
                />
              </motion.section>

              {/* Bento Section */}
              <section className="grid grid-cols-12 gap-6 mb-8">
                {/* Sentiment Overview */}
                <motion.div
                  className="col-span-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-white/80 dark:bg-app-surface/80 backdrop-blur-sm border-app-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">Ringkasan Sentimen</CardTitle>
                        {items.length > 0 && (
                          <Badge variant="secondary">{items.length} Analisis</Badge>
                        )}
                      </div>
                      <p className="text-sm text-app-muted">
                        Distribusi rata-rata sentimen dari seluruh analisis Anda.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      ) : items.length > 0 ? (
                        <SentimentBarChart items={items} />
                      ) : (
                        <motion.div
                          className="flex flex-col items-center justify-center py-12 gap-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <FaChartLine className="h-12 w-12 text-app-muted/40" />
                          <p className="text-app-muted">Belum ada data. Mulai analisis pertama.</p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </section>

              {/* Recent Analytics Table */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-white/80 dark:bg-app-surface/80 backdrop-blur-sm border-app-border overflow-hidden">
                  <CardHeader className="border-b border-app-border/50 bg-app-surface-low/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold">Analisis Terbaru</CardTitle>
                      <Button variant="ghost" size="sm" className="text-app-muted">
                        Lihat Semua Riwayat
                      </Button>
                    </div>
                  </CardHeader>

                  <AnimatePresence mode="wait">
                    {statsLoading ? (
                      <CardContent className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </CardContent>
                    ) : recentItems.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-16 gap-4"
                      >
                        <FiRotateCw className="h-12 w-12 text-app-muted/40" />
                        <p className="text-app-muted">Belum ada analisis. Mulai dari dashboard.</p>
                        <Button onClick={handleSearch} size="sm">Mulai Analisis</Button>
                      </motion.div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-app-surface-low/50 border-b border-app-border/50">
                              <th className="text-left px-6 py-4 text-xs font-bold text-app-muted uppercase tracking-wider">Keyword</th>
                              <th className="text-left px-6 py-4 text-xs font-bold text-app-muted uppercase tracking-wider">Sentimen Utama</th>
                              <th className="text-left px-6 py-4 text-xs font-bold text-app-muted uppercase tracking-wider">Volume</th>
                              <th className="text-left px-6 py-4 text-xs font-bold text-app-muted uppercase tracking-wider">Skor</th>
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
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
                                  <motion.tr
                                    key={item.jobId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-app-border/30 hover:bg-app-surface-low/50 transition-colors"
                                  >
                                    <td className="px-6 py-4">
                                      <Button
                                        variant="link"
                                        className="text-app-main font-bold p-0 h-auto"
                                        onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                                      >
                                        {item.query}
                                      </Button>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary.color }} />
                                        <span className="text-sm font-medium text-app-main">{primary.label}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-app-muted font-medium">
                                      {item.total.toLocaleString()} tweets
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge
                                        className={
                                          score >= 70
                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            : score >= 40
                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                            : "bg-red-100 text-red-700 border-red-200"
                                        }
                                      >
                                        {score}
                                      </Badge>
                                    </td>
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
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-app-primary border-t-transparent rounded-full"
        />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}