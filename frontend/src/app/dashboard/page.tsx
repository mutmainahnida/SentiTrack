"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import PageLayout from "@/components/PageLayout";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, pendingSearchQuery, setPendingSearchQuery, markPendingSearchExecuted, openLoginModal } = useAuthStore();
  // Initialize search query from URL param if present (render-time, no effect needed)
  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const lastProcessedRef = useRef<string | null>(null);

  // Initialize from URL on mount (capture value once to avoid infinite effect)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && urlQuery) {
      setSearchQuery(urlQuery);
      setInitialized(true);
    }
  }, [initialized, urlQuery]);

  // Handle deferred search after login
  useEffect(() => {
    if (isAuthenticated && pendingSearchQuery && pendingSearchQuery !== lastProcessedRef.current) {
      const q = pendingSearchQuery;
      lastProcessedRef.current = q;
      markPendingSearchExecuted();
      setPendingSearchQuery(null);
      // No setIsLoading here — navigation handles the UX
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }, [isAuthenticated, pendingSearchQuery, markPendingSearchExecuted, setPendingSearchQuery, router]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) {
      setPendingSearchQuery(searchQuery.trim());
      openLoginModal("search");
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <PageLayout>
      <div className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        <TopBar />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full">
            {/* Hero Section */}
            <section className="bg-app-bg dark:bg-app-surface-low rounded-xl p-16 text-center mb-12 border border-app-border-strong dark:border-app-border-strong">
            {/* Badge */}
            <div className="inline-flex px-3 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-xs font-bold uppercase tracking-wider mb-6">
              AI-Powered Insights
            </div>

            {/* H1 */}
            <h1 className="text-5xl font-black tracking-tighter leading-tight text-app-main dark:text-app-main mb-6">
              Analisis Sentimen Twitter
              <br />
              dalam 5 Detik
            </h1>

            {/* Description */}
            <p className="text-app-muted dark:text-app-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Dapatkan pemahaman mendalam tentang sentimen publik terhadap topik, brand, atau akun Twitter dalam hitungan detik dengan analisis bertenaga AI.
            </p>

            {/* Search Bar */}
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
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

            {/* Popular Tags */}
            <p className="text-xs text-app-muted dark:text-app-muted mt-4">
              Populer: <span className="font-medium">#TeknologiAI</span>{" "}
              <span className="font-medium">#Ekonomi2024</span>{" "}
              <span className="font-medium">@SentiTrack_HQ</span>
            </p>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Card 1: Total Searches */}
            <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                  <MaterialIcon name="monitoring" className="text-xl text-app-primary dark:text-app-primary" />
                </div>
                <div className="flex items-center gap-1 text-app-primary dark:text-app-primary text-xs font-bold">
                  +12%
                  <MaterialIcon name="trending_up" className="text-sm" />
                </div>
              </div>
              <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">1,284,092</p>
              <p className="text-sm text-app-muted dark:text-app-muted font-medium">Total Searches</p>
              <div className="mt-4 h-1.5 bg-app-surface-low dark:bg-app-surface-low rounded-full overflow-hidden">
                <div className="h-full bg-app-primary dark:bg-app-primary rounded-full w-3/4" />
              </div>
            </div>

            {/* Card 2: Average Accuracy */}
            <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                  <MaterialIcon name="verified" className="text-xl text-app-primary dark:text-app-primary" />
                </div>
                <span className="px-2 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-muted dark:text-app-muted text-xs font-bold">
                  Stable
                </span>
              </div>
              <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-1">82%</p>
              <p className="text-sm text-app-muted dark:text-app-muted font-medium">Average Accuracy</p>
            </div>

            {/* Card 3: Trending Topics */}
            <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border-strong dark:border-app-border-strong group hover:border-app-primary/50 dark:hover:border-app-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-app-surface-low dark:bg-app-surface-low flex items-center justify-center">
                  <MaterialIcon name="hub" className="text-xl text-app-primary dark:text-app-primary" />
                </div>
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-3xl font-black text-app-main dark:text-app-main tracking-tight mb-4">Trending Topics</p>
              <div className="space-y-2">
                {["#TechNews", "#AI2024", "#Crypto"].map((topic, i) => (
                  <div key={topic} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-app-main dark:text-app-main">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bento Section */}
          <section className="grid grid-cols-12 gap-6 mb-12">
            {/* Left: Precision Emotion Mapping */}
            <div className="col-span-8 bg-app-surface-low dark:bg-app-surface-low rounded-xl p-8 border border-app-border-strong dark:border-app-border-strong">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-app-main dark:text-app-main tracking-tight mb-1">
                    Precision Emotion Mapping
                  </h2>
                  <p className="text-sm text-app-muted dark:text-app-muted">
                    AI-driven analysis mapping 8 core emotions across tweets with contextual nuance detection.
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary text-xs font-bold">
                  NEW
                </span>
              </div>
              <a href="#" className="inline-flex items-center gap-1 text-app-primary dark:text-app-primary text-sm font-bold hover:underline mb-8">
                Learn about our methodology
                <MaterialIcon name="arrow_forward" className="text-sm" />
              </a>
              {/* Bar Chart Visual */}
              <div className="bg-app-bg dark:bg-app-surface-low rounded-lg p-4 border border-app-border-strong dark:border-app-border-strong">
                <div className="flex items-end gap-3 h-40 mt-4">
                  {[
                    { label: "Joy", height: "h-20", color: "bg-app-primary dark:bg-app-primary" },
                    { label: "Trust", height: "h-32", color: "bg-app-primary/80 dark:bg-app-primary/80" },
                    { label: "Fear", height: "h-12", color: "bg-app-primary/50 dark:bg-app-primary/50" },
                    { label: "Sadness", height: "h-16", color: "bg-app-primary/60 dark:bg-app-primary/60" },
                    { label: "Anger", height: "h-10", color: "bg-app-primary/40 dark:bg-app-primary/40" },
                    { label: "Surprise", height: "h-24", color: "bg-app-primary/70 dark:bg-app-primary/70" },
                  ].map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-full ${bar.height} ${bar.color} rounded-t-lg`} />
                      <span className="text-xs text-app-muted dark:text-app-muted">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Automated Reports */}
            <div className="col-span-4 bg-app-primary dark:bg-app-primary text-white rounded-xl p-8 flex flex-col justify-between">
              <div>
                <MaterialIcon name="auto_awesome" filled={1} className="text-3xl mb-4" />
                <h2 className="text-xl font-black mb-2">Automated Reports</h2>
                <p className="text-sm opacity-90 leading-relaxed">
                  Generate comprehensive PDF reports with sentiment breakdowns, trend analysis, and actionable insights.
                </p>
              </div>
              <button className="mt-6 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </section>

          {/* Recent Analytics Table */}
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-app-main dark:text-app-main tracking-tight">Recent Analytics</h2>
              <button className="text-xs font-bold text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary transition-colors">
                View All History
              </button>
            </div>

            <div className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-app-surface-low/50 dark:bg-app-surface-low border-b border-app-border-strong dark:border-app-border-strong/20">
                    <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">
                      Keyword / Source
                    </th>
                    <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">
                      Primary Sentiment
                    </th>
                    <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">
                      Volume
                    </th>
                    <th className="text-start px-6 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted dark:text-app-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr className="border-b border-slate-100 dark:border-app-border-strong/20 hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-app-main dark:text-app-main">#Bitcoin</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-app-main dark:text-app-main">
                          Highly Positive (78%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-app-muted dark:text-app-muted font-medium">
                      42,103 tweets
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-xs font-bold">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                  {/* Row 2 */}
                  <tr className="hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-app-main dark:text-app-main">@AppleVisionPro</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium text-app-main dark:text-app-main">
                          Mixed (42%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-app-muted dark:text-app-muted font-medium">
                      12,900 tweets
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-xs font-bold">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
