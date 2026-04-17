"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useSearchAnalysis, type ScrapedTweet } from "@/hooks/useSearchAnalysis";

const SENTIMENT_ICONS: Record<string, string> = {
  positive: "sentiment_satisfied",
  neutral: "sentiment_neutral",
  negative: "sentiment_dissatisfied",
};

const SENTIMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  positive: { bg: "bg-green-50 dark:bg-green-900/40", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800/50" },
  neutral: { bg: "bg-yellow-50 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800/50" },
  negative: { bg: "bg-red-50 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800/50" },
};

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function TweetCard({ tweet, sentiment }: { tweet: ScrapedTweet; sentiment: "positive" | "neutral" | "negative" }) {
  const colors = SENTIMENT_COLORS[sentiment];

  return (
    <article className="bg-app-bg dark:bg-app-surface-low border border-app-border/20 dark:border-app-border/20 rounded-xl p-6 shadow-sm hover:border-app-primary/30 transition-colors">
      {/* Header Row */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-surface-low dark:bg-app-surface-lowest flex items-center justify-center flex-shrink-0">
          <MaterialIcon name="person" className="text-2xl text-app-muted dark:text-app-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-app-main dark:text-app-main">{tweet.name}</span>
            <span className="text-app-muted dark:text-app-muted">@{tweet.username}</span>
            <span className={`ml-auto inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
              <MaterialIcon name={SENTIMENT_ICONS[sentiment]} />
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted dark:text-app-muted">
            {tweet.sentimentScore > 0 && (
              <span className="flex items-center gap-0.5">
                <MaterialIcon name="thumb_up" className="text-[10px]" />
                {tweet.sentimentScore > 0 ? `+${tweet.sentimentScore}` : tweet.sentimentScore}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <MaterialIcon name="insights" className="text-[10px]" />
              Influence: {formatNumber(tweet.influenceScore)}
            </span>
          </div>
        </div>
      </div>

      {/* Tweet Text */}
      <p className="text-app-main dark:text-app-main mb-4 leading-relaxed">{tweet.text}</p>

      {/* Stats Row */}
      <div className="flex items-center gap-1 text-app-muted dark:text-app-muted text-sm border-t border-app-border/10 dark:border-app-border/10 pt-3">
        <button className="flex items-center gap-1.5 hover:text-app-primary transition-colors px-2 py-1 rounded hover:bg-app-surface-low">
          <MaterialIcon name="chat_bubble" className="text-base" /><span>{formatNumber(tweet.replies)}</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/10">
          <MaterialIcon name="repeat" className="text-base" /><span>{formatNumber(tweet.retweets)}</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10">
          <MaterialIcon name="favorite" className="text-base" /><span>{formatNumber(tweet.likes)}</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-app-primary transition-colors px-2 py-1 rounded hover:bg-app-surface-low">
          <MaterialIcon name="visibility" className="text-base" /><span>{formatNumber(tweet.views)}</span>
        </button>
        <a
          href={`https://x.com/i/status/${tweet.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 hover:text-app-primary transition-colors px-2 py-1 rounded hover:bg-app-surface-low"
        >
          <MaterialIcon name="open_in_new" className="text-base" />
        </a>
      </div>
    </article>
  );
}

function TopKeywordsCard({ keywords, onKeywordClick }: { keywords: string[]; onKeywordClick: (kw: string) => void }) {
  return (
    <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 border border-app-border/20 dark:border-app-border/20">
      <div className="flex items-center justify-start mb-5">
        <h3 className="text-sm font-bold text-app-main dark:text-app-main">Trending Keywords</h3>
        <MaterialIcon name="trending_up" className="text-app-primary" />
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((tag) => (
          <button
            key={tag}
            onClick={() => onKeywordClick(tag)}
            className="bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-app-primary/20 dark:hover:bg-app-primary/20 transition-colors flex items-center gap-1"
          >
            <MaterialIcon name="search" className="text-[10px]" />
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}




function MetricsCard({ label, value, pct, color, count }: { label: string; value: number; pct: string; color: string; count: number }) {
  return (
    <div className="relative bg-app-surface-low dark:bg-app-surface-low border border-app-border/10 dark:border-app-border/10 rounded-xl p-6 flex flex-col gap-4 overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-2" style={{ backgroundColor: color }} />
      <div>
        <p className="text-app-primary dark:text-app-primary font-semibold mb-1">{label}</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-black text-app-main dark:text-app-main leading-none">{value}%</span>
          <span className="text-app-muted dark:text-app-muted mb-1 font-medium">{count.toLocaleString()} tweets</span>
        </div>
      </div>
      <div>
        <div className="h-1.5 bg-app-surface-low dark:bg-app-surface-low rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

function AnalysisResults({ result, onAnalyze }: { result: { score: number; positive: number; neutral: number; negative: number; total: number; topKeywords: string[]; tweets: ScrapedTweet[]; topInfluential: ScrapedTweet[]; query: string }; onAnalyze: (q: string) => void }) {
  const scoreLabel = result.score >= 70 ? "High Sentiment" : result.score >= 40 ? "Mixed Sentiment" : "Low Sentiment";
  const scoreIcon = result.score >= 70 ? "sentiment_satisfied" : result.score >= 40 ? "sentiment_neutral" : "sentiment_dissatisfied";
  const scoreColorClass = result.score >= 70 ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : result.score >= 40 ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400";

  return (
    <>
      {/* Score + Sentiment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
        {/* Overall Score */}
        <div className="bg-app-bg dark:bg-app-surface-low rounded-xl p-6 text-center border border-slate-200 dark:border-app-border-strong">
          <p className="text-xs font-bold uppercase tracking-widest text-app-muted dark:text-app-muted mb-4">Overall Score</p>
          <p className="text-5xl font-black text-app-main dark:text-app-main leading-none">
            {result.score}<span className="text-xl font-normal text-app-muted">/100</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${scoreColorClass}`}>
              <MaterialIcon name={scoreIcon} />
              {scoreLabel}
            </span>
          </div>
        </div>

        {/* Sentiment Cards */}
        <MetricsCard label="Positive" value={result.positive} pct={`${result.positive}%`} color="#22c55e" count={Math.round(result.total * result.positive / 100)} />
        <MetricsCard label="Neutral" value={result.neutral} pct={`${result.neutral}%`} color="#eab308" count={Math.round(result.total * result.neutral / 100)} />
        <MetricsCard label="Negative" value={result.negative} pct={`${result.negative}%`} color="#f87171" count={Math.round(result.total * result.negative / 100)} />
      </div>

      {/* Main Layout */}
      <div className="space-y-6">
        {/* Top Keywords + Total Data */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <TopKeywordsCard keywords={result.topKeywords} onKeywordClick={onAnalyze} />
          </div>
          <div className="lg:col-span-4">
            <div className="bg-app-primary dark:bg-app-primary rounded-xl p-6 text-white flex flex-col justify-between h-full">
              <div>
                <p className="text-sm font-bold opacity-80 mb-2">Total Data</p>
                <p className="text-4xl font-black">{result.total.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">tweets analyzed</p>
              </div>
              <MaterialIcon name="analytics" className="text-4xl opacity-50" />
            </div>
          </div>
        </div>

        {/* Top Influential */}
        <div>
          <h2 className="text-xl font-bold text-app-main dark:text-app-main mb-1">
            Top Influential Tweets
          </h2>
          <p className="text-sm text-app-muted dark:text-app-muted mb-4">
            Highest reach and engagement tweets for "{result.query}"
          </p>
          <div className="space-y-4">
            {result.topInfluential.map((tweet) => (
              <TweetCard key={tweet.tweetId} tweet={tweet} sentiment={tweet.sentiment} />
            ))}
          </div>
        </div>

        {/* All Tweets */}
        {result.tweets.length > result.topInfluential.length && (
          <div>
            <h2 className="text-xl font-bold text-app-main dark:text-app-main mb-1">
              All Analyzed Tweets
              <span className="ml-2 text-sm font-normal text-app-muted">({result.tweets.length} tweets)</span>
            </h2>
            <div className="space-y-4 mt-4">
              {result.tweets.slice(result.topInfluential.length).map((tweet) => (
                <TweetCard key={tweet.tweetId} tweet={tweet} sentiment={tweet.sentiment} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 py-12">
      <p className="text-app-muted dark:text-app-muted">Ketik keyword dan klik Analyze untuk memulai analisis</p>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(urlQuery);
  const [analysisDone, setAnalysisDone] = useState(false);

  const { status, messageIndex, result, error, startAnalysis } = useSearchAnalysis();

  useEffect(() => {
    if (urlQuery && !searchValue && status === "idle") {
      setSearchValue(urlQuery);
    }
  }, [urlQuery, searchValue, status]);

  useEffect(() => {
    if (urlQuery && status === "idle" && !analysisDone) {
      startAnalysis(urlQuery);
      setAnalysisDone(true);
    }
  }, [urlQuery, status, analysisDone, startAnalysis]);

  const handleAnalyze = (kw?: string) => {
    const q = (kw ?? searchValue).trim();
    if (!q) return;
    if (kw) setSearchValue(kw);
    startAnalysis(q);
    setAnalysisDone(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-app-bg">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        <TopBar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full">

              {/* Search Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-6">
                <div className="relative flex-1 max-w-4xl">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">
                    <MaterialIcon name="search" />
                  </span>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                    placeholder="Search keywords or topics..."
                    disabled={status === "loading"}
                    className="w-full pl-12 pr-4 py-4 bg-app-bg dark:bg-app-surface-low border border-app-border-strong dark:border-app-border-strong rounded-xl text-app-main dark:text-app-main placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-primary/40 disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleAnalyze()}
                    disabled={status === "loading" || !searchValue.trim()}
                    className="flex items-center gap-2 px-5 py-3 bg-app-primary dark:bg-app-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <MaterialIcon name="trending_up" />
                    <span>{status === "loading" ? "Analyzing..." : "Analyze"}</span>
                  </button>

                  <button className="flex items-center gap-2 px-5 py-3 bg-app-surface-lowest dark:bg-app-surface-lowest text-app-primary dark:text-app-primary font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    <MaterialIcon name="download" />
                    <span>Export to CSV</span>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                {status === "loading" && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingAnimation messageIndex={messageIndex} />
                  </div>
                )}
                {status === "error" && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <MaterialIcon name="error_outline" className="text-5xl text-red-500" />
                    <p className="text-app-muted dark:text-app-muted">{error}</p>
                    <button onClick={() => handleAnalyze()} className="px-6 py-2 bg-app-primary text-white font-bold rounded-xl hover:opacity-90">Coba Lagi</button>
                  </div>
                )}
                {status === "done" && result && <AnalysisResults result={result} onAnalyze={handleAnalyze} />}
                {status === "idle" && !urlQuery && <IdleState />}
              </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}