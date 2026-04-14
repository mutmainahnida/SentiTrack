"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import PageLayout from "@/components/PageLayout";

const tableData = [
  {
    keyword: "Apple Vision Pro Review",
    datetime: "14 April, 16:30",
    overallScore: 84.2,
    scoreLabel: "Positive",
  },
  {
    keyword: "Global Market Inflation",
    datetime: "14 April, 14:15",
    overallScore: 32.1,
    scoreLabel: "Negative",
  },
  {
    keyword: "AI Regulation Trends 2024",
    datetime: "13 April, 09:45",
    overallScore: 58.9,
    scoreLabel: "Mixed",
  },
  {
    keyword: "Sustainable Tech Innovations",
    datetime: "12 April, 11:20",
    overallScore: 91.4,
    scoreLabel: "Positive",
  },
];

export default function HistoryPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <PageLayout>
      <div className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky TopBar */}
        <TopBar />

        {/* Scrollable content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full flex flex-col gap-8">

            {/* ── Stats Bento ── */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Total Scans */}
              <div className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong p-6 shadow-sm">
                <p className="text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Total Scans</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-app-main dark:text-app-main">1,284</span>
                  <span className="text-emerald-500 text-xs font-bold mb-1">+12%</span>
                </div>
              </div>

              {/* Card 2: Avg. Sentiment */}
              <div className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong p-6 shadow-sm">
                <p className="text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Avg. Sentiment</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-app-main dark:text-app-main">72.4</span>
                  <div className="flex gap-1 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="w-2 h-2 rounded-full bg-app-surface-lowest dark:bg-app-surface-container" />
                    <span className="w-2 h-2 rounded-full bg-app-surface-lowest dark:bg-app-surface-container" />
                  </div>
                </div>
              </div>

              {/* Card 3: Peak Hour */}
              <div className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong p-6 shadow-sm">
                <p className="text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wider mb-1">Peak Hour</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-app-main dark:text-app-main">14:00</span>
                  <span className="text-app-muted dark:text-app-muted text-xs font-bold mb-1">UTC</span>
                </div>
              </div>

              {/* Card 4: Active Credits */}
              <div className="bg-app-primary dark:bg-app-primary rounded-xl border border-app-primary dark:border-app-primary p-6 shadow-lg shadow-app-primary/10 dark:shadow-app-primary/10 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Active Credits</p>
                  <MaterialIcon name="bolt" className="text-lg text-white/80" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">4,150</span>
                </div>
                <p className="text-sm text-white/60 mt-1">Available</p>
              </div>
            </section>

            {/* ── Search History Table ── */}
            <section className="bg-app-bg dark:bg-app-surface-low rounded-xl border border-app-border-strong dark:border-app-border-strong shadow-sm overflow-hidden">
              {/* Table header controls */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-app-border-strong">
                <div className="relative w-72">
                  <MaterialIcon
                    name="search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted text-lg"
                  />
                  <input
                    type="text"
                    placeholder="Filter history..."
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-app-surface-low dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main placeholder:text-app-muted dark:placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-primary/20 dark:focus:ring-app-primary/20 focus:border-app-primary dark:focus:border-app-primary"
                  />
                </div>
                <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-app-bg dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors">
                  <MaterialIcon name="filter_list" className="text-base" />
                  Filter
                </button>
                <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-app-bg dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors">
                  <MaterialIcon name="download" className="text-base" />
                  Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-app-surface-low/50 dark:bg-app-surface-low border-b border-app-border-strong dark:border-app-border-strong">
                      <th className="text-left px-6 py-3 text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
                        Keyword
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
                        Date / Time
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
                        Sentiment Mix
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
                        Overall Score
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-bold text-app-muted dark:text-app-muted uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-app-surface-container">
                    {tableData.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-app-surface-low/80 dark:hover:bg-app-surface-low transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-app-main dark:text-app-main tracking-tight">{row.keyword}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm text-app-muted dark:text-app-muted font-medium">{row.datetime}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="flex gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <div className="w-2.5 h-2.5 rounded-full bg-app-primary dark:bg-app-surface-container" />
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              row.scoreLabel === "Positive"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                                : row.scoreLabel === "Negative"
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50"
                                : "bg-blue-50 dark:bg-app-primary/20 text-blue-600 dark:text-app-primary border-blue-100 dark:border-app-primary/30"
                            }`}
                          >
                            {row.overallScore}
                          </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-1 transition-opacity">
                            <button className="p-1.5 rounded-md text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors" title="View">
                              <MaterialIcon name="visibility" className="text-base" />
                            </button>
                            <button className="p-1.5 rounded-md text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors" title="Download">
                              <MaterialIcon name="download" className="text-base" />
                            </button>
                            <button className="p-1.5 rounded-md text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors" title="Delete">
                              <MaterialIcon name="delete" className="text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-app-border-strong">
                <p className="text-xs text-app-muted dark:text-app-muted">
                  Showing 1 to 4 of 1,284 results
                </p>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors">
                    <MaterialIcon name="chevron_left" className="text-base" />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md bg-app-primary dark:bg-app-primary text-white text-sm font-medium">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted text-sm hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors">
                    2
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted text-sm hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors">
                    3
                  </button>
                  <span className="px-1 text-app-muted dark:text-app-muted">…</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted text-sm hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors">
                    128
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border-strong dark:border-app-border-strong text-app-muted dark:text-app-muted hover:bg-app-primary hover:text-app-surface dark:hover:bg-app-primary transition-colors">
                    <MaterialIcon name="chevron_right" className="text-base" />
                  </button>
                </div>
              </div>
            </section>

            {/* ── Contextual Insight Cards ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: Automated Monthly Reports */}
              <div className="bg-app-surface-low dark:bg-app-surface-low rounded-xl p-8 border border-app-border-strong dark:border-app-border-strong relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-app-muted dark:text-app-muted uppercase tracking-widest mb-2">
                    Automation
                  </p>
                  <h3 className="text-xl font-bold text-app-main dark:text-app-main mb-2">
                    Automated Monthly Reports
                  </h3>
                  <p className="text-sm text-app-muted dark:text-app-muted mb-6 leading-relaxed">
                    Get comprehensive sentiment analysis delivered to your inbox every month.
                    Stay ahead with zero manual effort — schedule, customize, and share reports
                    with your team instantly.
                  </p>
                  <button className="bg-app-primary dark:bg-app-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                    Configure Email Alerts
                  </button>
                </div>
                <MaterialIcon
                  name="mail"
                  className="absolute bottom-4 right-4 text-[80px] text-app-main dark:text-app-main opacity-[0.07] z-0 select-none pointer-events-none"
                />
              </div>

              {/* Card 2: API Integration Now Live */}
              <div className="bg-app-primary dark:bg-app-primary text-white rounded-xl p-8 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-2">
                    Developers
                  </p>
                  <h3 className="text-xl font-bold text-white mb-2">
                    API Integration Now Live
                  </h3>
                  <p className="text-sm text-white/80 mb-6 leading-relaxed">
                    Build with SentiTrack. Our REST API gives you programmatic access to
                    sentiment analysis, historical data, and real-time tracking — with generous
                    rate limits for all plans.
                  </p>
                  <button className="bg-white dark:bg-white text-app-primary dark:text-app-primary text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 dark:hover:bg-white/90 transition-colors">
                    Read Documentation
                  </button>
                </div>
                <MaterialIcon
                  name="code"
                  className="absolute bottom-4 right-4 text-[80px] text-white opacity-[0.10] z-0 select-none pointer-events-none"
                />
              </div>
            </section>

            {/* ── Page Footer ── */}
            <footer className="mt-auto pt-6 pb-2 flex justify-between text-[10px] uppercase tracking-widest font-bold text-app-muted dark:text-app-muted border-t border-app-border-strong dark:border-app-border-strong">
              <span>© 2024 SentiTrack Intelligence Platform</span>
              <div className="flex gap-6">
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
