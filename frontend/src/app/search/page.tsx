"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import PageLayout from "@/components/PageLayout";

function SearchContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(urlQuery);

  useEffect(() => {
    if (urlQuery) {
      setSearchValue(urlQuery);
    }
  }, [urlQuery]);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      <Sidebar />
      <PageLayout>
        <div className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
          <TopBar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-8">
              {/* Search Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-6">
                <div className="relative flex-1 max-w-2xl">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">
                    <MaterialIcon name="search" />
                  </span>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search keywords or topics..."
                    className="w-full pl-12 pr-4 py-4 bg-app-bg dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong rounded-xl text-app-main dark:text-app-main placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-primary/40 dark:focus:ring-app-primary/40"
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button className="flex items-center gap-2 px-5 py-3 bg-app-surface-lowest dark:bg-app-surface-lowest text-app-primary dark:text-app-primary font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    <MaterialIcon name="bookmark" />
                    <span>Save Search</span>
                  </button>
                  <button className="flex items-center gap-2 px-5 py-3 bg-app-primary dark:bg-app-primary text-white font-semibold rounded-xl hover:bg-app-primary dark:hover:bg-app-primary/90 transition-colors">
                    <MaterialIcon name="download" />
                    <span>Export to CSV</span>
                  </button>
                </div>
              </div>

              {/* Metric Section */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-8 text-center border border-slate-200 dark:border-app-border-strong">
                  <p className="text-xs font-bold uppercase tracking-widest text-app-muted dark:text-app-muted mb-4">Overall Score</p>
                  <p className="text-6xl font-black text-app-main dark:text-app-main leading-none">
                    78<span className="text-2xl font-normal text-app-muted">/100</span>
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full px-3 py-1 text-sm font-semibold">
                      <MaterialIcon name="trending_up" />
                      High Sentiment
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Positive", pct: "65%", posts: "1,240", color: "#22c55e" },
                    { label: "Neutral", pct: "20%", posts: "380", color: "#eab308" },
                    { label: "Negative", pct: "15%", posts: "285", color: "#f87171" },
                  ].map((m) => (
                    <div key={m.label} className="relative bg-app-surface-low dark:bg-app-surface-low border border-app-border/10 dark:border-app-border/10 rounded-xl p-6 flex flex-col gap-4 overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-2" style={{ backgroundColor: m.color }} />
                      <div>
                        <p className="text-app-primary dark:text-app-primary font-semibold mb-1">{m.label}</p>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black text-app-main dark:text-app-main leading-none">{m.pct}</span>
                          <span className="text-app-muted dark:text-app-muted mb-1 font-medium">{m.posts} posts</span>
                        </div>
                      </div>
                      <div>
                        <div className="h-1.5 bg-app-surface-low dark:bg-app-surface-low rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: m.pct, backgroundColor: m.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-app-main dark:text-app-main">Recent Mentions</h2>
                    <button className="text-sm font-semibold text-app-primary dark:text-app-primary hover:text-app-primary/80 transition-colors flex items-center gap-1">
                      View all <MaterialIcon name="chevron_right" />
                    </button>
                  </div>
                  {[
                    { name: "Alex Chen", handle: "@alexchen", time: "2h ago", sentiment: "Positive", color: "green", icon: "sentiment_satisfied", text: "Just got the iPhone 15 Pro Max and the titanium frame feels amazing. Battery life is a huge upgrade from my 13 — easily lasts all day with heavy use!", likes: "2,841", retweets: "412", comments: "89", img: "1" },
                    { name: "Jordan Lee", handle: "@jlee_tech", time: "4h ago", sentiment: "Neutral", color: "yellow", icon: "sentiment_neutral", text: "The iPhone 15 event was interesting. USB-C is finally here, Dynamic Island is expanding to base models. Not sure if I'll upgrade this year though.", likes: "1,203", retweets: "338", comments: "67", img: "5" },
                    { name: "Sam Rivera", handle: "@samrivera", time: "6h ago", sentiment: "Negative", color: "red", icon: "sentiment_dissatisfied", text: "iPhone 15 prices are ridiculous. $1,199 for the base Pro? The camera upgrades aren't worth the price jump from the 14 Pro. Titanium feels like a marketing gimmick.", likes: "987", retweets: "275", comments: "54", img: "8" },
                  ].map((tweet) => (
                    <article key={tweet.handle} className="bg-app-bg dark:bg-app-surface-low border border-app-border/20 dark:border-app-border/20 rounded-xl p-6 shadow-sm hover:border-app-primary/30 transition-colors">
                      <div className="flex items-start gap-4 mb-4">
                        <img src={`https://i.pravatar.cc/96?img=${tweet.img}`} alt="User avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-app-main dark:text-app-main">{tweet.name}</span>
                            <span className="text-app-muted dark:text-app-muted">{tweet.handle}</span>
                            <span className="text-app-muted text-xs">· {tweet.time}</span>
                            <span className={`ml-auto inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              tweet.color === "green" ? "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50" :
                              tweet.color === "yellow" ? "bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50" :
                              "bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
                            }`}>
                              <MaterialIcon name={tweet.icon} />
                              {tweet.sentiment}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-app-main dark:text-app-main mb-4 leading-relaxed">{tweet.text}</p>
                      <div className="flex items-center gap-6 text-app-muted dark:text-app-muted">
                        <button className="flex items-center gap-1.5 hover:text-app-primary dark:hover:text-app-primary transition-colors"><MaterialIcon name="favorite" /><span>{tweet.likes}</span></button>
                        <button className="flex items-center gap-1.5 hover:text-app-primary dark:hover:text-app-primary transition-colors"><MaterialIcon name="sync" /><span>{tweet.retweets}</span></button>
                        <button className="flex items-center gap-1.5 hover:text-app-primary dark:hover:text-app-primary transition-colors"><MaterialIcon name="chat_bubble" /><span>{tweet.comments}</span></button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-app-surface-low dark:bg-app-surface-low rounded-xl p-6 border border-app-border/10 dark:border-app-border/10">
                    <h3 className="text-sm font-bold text-app-main dark:text-app-main mb-5">Volume Over Time</h3>
                    <div className="flex items-end gap-3 h-32">
                      {["60%", "45%", "80%", "55%", "70%", "35%", "90%"].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full rounded-t-sm" style={{ height: h, backgroundColor: i === 6 ? "#3525cd" : "rgba(53,37,205,0.2)" }} />
                          {["Mon", "", "Wed", "", "Fri", "", "Sun"][i] && <span className="text-xs text-app-muted dark:text-app-muted">{["Mon", "", "Wed", "", "Fri", "", "Sun"][i]}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border/20 dark:border-app-border/20">
                    <h3 className="text-sm font-bold text-app-main dark:text-app-main mb-5">Key Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {["Camera", "Battery", "USB-C", "Titanium", "Dynamic Island", "Price", "Upgrade"].map((tag) => (
                        <span key={tag} className="bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary rounded-full px-3 py-1 text-xs font-semibold">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-app-primary dark:bg-app-primary rounded-xl p-6 text-white">
                    <h3 className="text-base font-bold mb-2">Need Deeper Insights?</h3>
                    <p className="text-sm opacity-80 mb-5">Unlock competitor comparisons, historical trends, and exportable reports.</p>
                    <button className="w-full py-3 bg-white text-app-main dark:text-app-primary font-bold rounded-xl hover:bg-white/90 transition-colors">Compare Competitors</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}