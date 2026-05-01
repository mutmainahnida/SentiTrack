"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar, { SidebarToggle } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { IconByName } from "@/components/ReactIcon";
import { FaSearch, FaArrowLeft, FaChartBar, FaDownload, FaExternalLinkAlt, FaUser, FaThumbsUp, FaComment, FaRetweet, FaHeart, FaEye } from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";
import { motion } from "framer-motion";
import PageLayout from "@/components/PageLayout";
import SpinningLoading from "@/components/LoadingAnimation";
import { authFetch } from "@/stores/authStore";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface ScrapedTweet {
  tweetId: string;
  name: string;
  username: string;
  text: string;
  replies: number;
  retweets: number;
  likes: number;
  views: number;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  influenceScore: number;
}

interface SentimentResult {
  jobId: string;
  query: string;
  total: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  topKeywords: string[];
  topInfluential: ScrapedTweet[];
  tweets: ScrapedTweet[];
}

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

function TweetCard({ tweet }: { tweet: ScrapedTweet }) {
  const colors = SENTIMENT_COLORS[tweet.sentiment];

  return (
    <article className="bg-app-bg dark:bg-app-surface-low border border-app-border/20 dark:border-app-border/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:border-app-primary/30 transition-colors">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-surface-low flex items-center justify-center flex-shrink-0">
          <FaUser className="text-2xl text-app-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-app-main">{tweet.name}</span>
            <span className="text-app-muted">@{tweet.username}</span>
            <span className={`ml-auto inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
              <IconByName name={`sentiment_${tweet.sentiment}`} />
              {tweet.sentiment.charAt(0).toUpperCase() + tweet.sentiment.slice(1)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-app-muted">
            <span className="flex items-center gap-0.5">
              <FaThumbsUp className="text-[10px]" />
              {tweet.sentimentScore > 0 ? `+${tweet.sentimentScore}` : tweet.sentimentScore}
            </span>
            <span className="flex items-center gap-0.5">
              <IconByName name="insights" className="text-[10px]" />
              {formatNumber(tweet.influenceScore)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm sm:text-base text-app-main mb-3 sm:mb-4 leading-relaxed">{tweet.text}</p>
      <div className="flex items-center gap-1 text-app-muted text-sm border-t border-app-border/10 pt-3">
        <span className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-app-surface-low transition-colors">
          <FaComment className="text-base" /><span>{formatNumber(tweet.replies)}</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
          <FaRetweet className="text-base" /><span>{formatNumber(tweet.retweets)}</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <FaHeart className="text-base" /><span>{formatNumber(tweet.likes)}</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-app-surface-low transition-colors">
          <FaEye className="text-base" /><span>{formatNumber(tweet.views)}</span>
        </span>
        <a href={`https://x.com/i/status/${tweet.tweetId}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 hover:text-app-primary transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-app-surface-low">
          <FaExternalLinkAlt className="text-base" />
        </a>
      </div>
    </article>
  );
}

function MetricsCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="relative bg-app-surface-low border border-app-border/10 rounded-xl p-4 sm:p-6 flex flex-col gap-2 overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
      <p className="text-xs font-semibold text-app-primary">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black text-app-main">{value}%</span>
      </div>
    </div>
  );
}

function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobId = params.jobId as string;
  const query = searchParams.get("q") ?? "";

  useEffect(() => {
    async function fetchDetail() {
      if (!jobId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${BACKEND_API}/api/sentiment/result/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setResult(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [jobId]);

  const overallScore = result
    ? result.positivePct >= 50
      ? 65 + Math.round(result.positivePct / 3)
      : result.positivePct >= 25
      ? 40 + Math.round(result.positivePct / 2)
      : 20 + result.positivePct
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinningLoading messageIndex={0} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-app-muted">{error}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-app-primary text-white font-bold rounded-lg hover:opacity-90">
          Kembali
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-app-surface-low transition-colors">
          <FaArrowLeft className="text-lg" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-app-main">Detail Analisis</h1>
          <p className="text-sm text-app-muted">"{result.query}" · {result.total.toLocaleString()} tweets</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-bg rounded-xl p-4 sm:p-6 text-center border border-slate-200 dark:border-app-border-strong">
          <p className="text-[10px] font-bold uppercase tracking-widest text-app-muted mb-2">Overall Score</p>
          <p className="text-3xl sm:text-4xl font-black text-app-main">{overallScore}<span className="text-lg font-normal text-app-muted">/100</span></p>
        </div>
        <MetricsCard label="Positive" value={result.positivePct} color="#22c55e" />
        <MetricsCard label="Neutral" value={result.neutralPct} color="#eab308" />
        <MetricsCard label="Negative" value={result.negativePct} color="#f87171" />
      </div>

      {/* Top Keywords */}
      {result.topKeywords.length > 0 && (
        <div className="bg-app-bg rounded-xl p-6 border border-app-border/20">
          <div className="flex items-center gap-2 mb-4">
            <FaChartBar className="text-app-primary" />
            <h3 className="font-bold text-app-main">Trending Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.topKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => router.push(`/search?q=${encodeURIComponent(kw)}`)}
                className="bg-app-surface-low text-app-primary rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-app-primary/20 transition-colors flex items-center gap-1"
              >
                <FaSearch className="text-[10px]" />
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Influential Tweets */}
      <div>
        <h2 className="text-lg font-bold text-app-main mb-4">Top Influential Tweets</h2>
        <div className="space-y-4">
          {result.topInfluential.map((tweet) => (
            <TweetCard key={tweet.tweetId} tweet={tweet} />
          ))}
        </div>
      </div>

      {/* All Tweets */}
      {result.tweets.length > result.topInfluential.length && (
        <div>
          <h2 className="text-lg font-bold text-app-main mb-4">
            All Analyzed Tweets
            <span className="ml-2 text-sm font-normal text-app-muted">({result.tweets.length} tweets)</span>
          </h2>
          <div className="space-y-4">
            {result.tweets.slice(result.topInfluential.length).map((tweet) => (
              <TweetCard key={tweet.tweetId} tweet={tweet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SentimentDetailPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <PageLayout>
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
          <TopBar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl mx-auto w-full">
              <Suspense fallback={<SpinningLoading />}>
                <DetailContent />
              </Suspense>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}
