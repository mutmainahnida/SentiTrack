"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, type Variants } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Repeat2,
  Heart,
  Eye,
  ArrowLeft,
  Search,
  TrendingUp,
  BarChart3,
  Clock,
  ExternalLink,
  Filter,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useSentimentHistoryDetail, type MappedTweet, type MappedHistoryDetail } from "@/hooks/useSentimentHistoryDetail";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/* ── Chart colors ──────────────────────────────────── */
const C_POS = "#22D3EE";
const C_NEU = "#818CF8";
const C_NEG = "#FB7185";
const C_MINT = "#34D399";

/* ── Helpers ─────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("id-ID");
}

/* ── Motion variants ─────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

/* ── Sentiment Pie Chart ─────────────────────────────── */
function SentimentPie({ detail }: { detail: MappedHistoryDetail }) {
  const posCount = Math.round((detail.positivePct / 100) * detail.total);
  const neuCount = Math.round((detail.neutralPct / 100) * detail.total);
  const negCount = Math.round((detail.negativePct / 100) * detail.total);

  const data = [
    { name: "Positive", value: detail.positivePct, count: posCount, color: C_POS },
    { name: "Neutral",  value: detail.neutralPct, count: neuCount, color: C_NEU },
    { name: "Negative", value: detail.negativePct, count: negCount, color: C_NEG },
  ];

  return (
    <div className="flex items-center gap-6">
      <div style={{ width: 160, height: 160, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-[var(--text-main)]">{detail.score}</span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">/100</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">{d.name}</span>
                <span className="text-sm font-bold text-[var(--text-main)]">{d.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                  initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{d.count.toLocaleString()} tweets</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Score Badge ─────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  const [color, label] = score >= 70
    ? [C_MINT, "Excellent"]
    : score >= 55
    ? [C_POS, "Good"]
    : score >= 40
    ? [C_NEU, "Mixed"]
    : [C_NEG, "Poor"];

  return (
    <Badge className="text-xs font-bold border-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </Badge>
  );
}

/* ── Status Pill ─────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const config = {
    COMPLETED: { icon: CheckCircle2, color: C_MINT, label: "Completed" },
    FAILED: { icon: XCircle, color: C_NEG, label: "Failed" },
    PROCESSING: { icon: AlertCircle, color: C_NEU, label: "Processing" },
    QUEUED: { icon: Clock, color: C_NEU, label: "Queued" },
  };
  const { icon: Icon, color, label } = config[status as keyof typeof config] ?? config.QUEUED;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

/* ── Keyword Tag ─────────────────────────────────── */
function KeywordTag({ kw, onClick }: { kw: string; onClick: (k: string) => void }) {
  return (
    <button onClick={() => onClick(kw)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-200">
      <Search className="w-3 h-3" />
      {kw}
    </button>
  );
}

/* ── Tweet Card ──────────────────────────────────── */
function TweetCard({ tweet, index, variant = "default" }: { tweet: MappedTweet; index: number; variant?: "default" | "compact" }) {
  const sentimentColor = tweet.sentiment === "positive" ? C_POS
    : tweet.sentiment === "negative" ? C_NEG : C_NEU;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="group rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all duration-300 overflow-hidden"
    >
      <div className="flex gap-0">
        {/* Sentiment accent bar */}
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: sentimentColor }} />

        <div className="flex-1 p-5">
          {variant === "default" && (
            /* Header — only in default mode */
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--surface-container)] to-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-black text-[var(--text-muted)]">
                    {tweet.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)] leading-tight">{tweet.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">@{tweet.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className="text-[10px] font-bold border-0"
                  style={{ background: `${sentimentColor}15`, color: sentimentColor, border: `1px solid ${sentimentColor}25` }}>
                  {tweet.sentimentLabel}
                </Badge>
                <a href={`https://x.com/i/status/${tweet.tweetId}`} target="_blank" rel="noopener noreferrer"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors p-1.5 rounded-lg hover:bg-[var(--surface-container)]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Text */}
          <p className={`text-sm text-[var(--text-main)] leading-relaxed ${variant === "compact" ? "mb-2" : "mb-4"} line-clamp-${variant === "compact" ? "2" : "3"}`}>
            {tweet.text}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{fmt(tweet.replies)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Repeat2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{fmt(tweet.retweets)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{fmt(tweet.likes)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{fmt(tweet.views)}</span>
            </div>
            {variant === "default" && tweet.influenceScore > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: C_MINT }}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Influence: {tweet.influenceScore.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Detail Content ────────────────────────────────── */
function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const { status, detail, error, fetchDetail } = useSentimentHistoryDetail(jobId);

  useEffect(() => {
    if (jobId) void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingAnimation />
      </div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 gap-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--surface)] to-[var(--surface-container)] border border-[var(--border)] flex items-center justify-center">
          <XCircle className="w-10 h-10 text-[var(--text-muted)]" style={{ color: C_NEG }} />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-black text-[var(--text-main)] mb-2">Detail Tidak Ditemukan</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{error ?? "Analisis yang Anda cari tidak ada atau telah dihapus."}</p>
        </div>
        <Button onClick={() => router.back()} className="font-bold">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </motion.div>
    );
  }

  if (!detail) return null;

  const filteredTweets = sentimentFilter === "all"
    ? detail.tweets
    : detail.tweets.filter(t => t.sentiment === sentimentFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* ══ Hero Header Section ═══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface-container-low)] to-[var(--surface)]"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--secondary)] to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8">
          {/* Top row: Back button + Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border)]">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-container)] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs font-semibold border-[var(--border-strong)]">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>
              <Button size="sm" className="text-xs font-semibold">
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            </div>
          </div>

          {/* Query + Metadata */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              {/* Query */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">Query</p>
                <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] leading-tight mb-2">
                  {detail.query}
                </h1>
                <div className="flex items-center gap-3">
                  <StatusPill status={detail.status} />
                  <ScoreBadge score={detail.score} />
                </div>
              </div>

              {/* Metadata pills */}
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-container)] border border-[var(--border)]">
                  <Clock className="w-3 h-3" />
                  <span>Dibuat: {detail.createdAtDisplay}</span>
                </div>
                {detail.completedAtDisplay !== "—" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-container)] border border-[var(--border)]">
                    <CheckCircle2 className="w-3 h-3" style={{ color: C_MINT }} />
                    <span>Selesai: {detail.completedAtDisplay}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-container)] border border-[var(--border)]">
                  <span className="font-mono text-[var(--primary)]">{detail.jobId.slice(-8)}</span>
                </div>
              </div>
            </div>

            {/* Quick stats card */}
            <div className="lg:w-80 space-y-3">
              <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Ringkasan Cepat</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Total Tweets</p>
                    <p className="text-2xl font-black text-[var(--text-main)] leading-none">{fmtCurrency(detail.total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Overall Score</p>
                    <p className="text-2xl font-black leading-none" style={{ color: detail.score >= 70 ? C_MINT : detail.score >= 40 ? C_NEU : C_NEG }}>
                      {detail.score}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Distribusi Sentimen</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Positive", pct: detail.positivePct, color: C_POS },
                    { label: "Neutral", pct: detail.neutralPct, color: C_NEU },
                    { label: "Negative", pct: detail.negativePct, color: C_NEG },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: item.color }}>{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ KPI Bento Grid ════════════════════════ */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall Score", value: detail.score, suffix: "/100", icon: BarChart3, color: C_MINT },
          { label: "Total Tweets", value: fmtCurrency(detail.total), suffix: "", icon: MessageSquare, color: C_POS },
          { label: "Positive Tweets", value: `${detail.positivePct}%`, suffix: "", icon: CheckCircle2, color: C_POS },
          { label: "Negative Tweets", value: `${detail.negativePct}%`, suffix: "", icon: XCircle, color: C_NEG },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} variants={fadeUp} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-[var(--text-main)] leading-none">{kpi.value}</span>
              <span className="text-sm font-medium text-[var(--text-muted)] mb-0.5">{kpi.suffix}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ══ Sentiment Distribution + Keywords (Bento) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-[var(--surface)] border border-[var(--border)] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-[var(--text-main)]">Distribusi Sentimen</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentPie detail={detail} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-[var(--surface)] border border-[var(--border)] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                Trending Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {detail.allKeywords.map((kw) => (
                  <KeywordTag
                    key={kw}
                    kw={kw}
                    onClick={(k) => router.push(`/search?q=${encodeURIComponent(k)}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ══ Top Influential Tweets ═══════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
            Top Influential Tweets
            <span className="text-sm font-medium text-[var(--text-muted)]">({detail.topInfluential.length})</span>
          </h2>
        </div>
        <div className="space-y-3">
          {detail.topInfluential.map((tweet, i) => (
            <TweetCard key={tweet.tweetId} tweet={tweet} index={i} />
          ))}
        </div>
      </motion.section>

      {/* ══ All Tweets with Filter ═══════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
            All Analyzed Tweets
            <span className="text-sm font-medium text-[var(--text-muted)]">({filteredTweets.length} tweets)</span>
          </h2>

          {/* Sentiment filter */}
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
            {[
              { key: "all", label: "All" },
              { key: "positive", label: "Positive" },
              { key: "neutral", label: "Neutral" },
              { key: "negative", label: "Negative" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSentimentFilter(filter.key as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  sentimentFilter === filter.key
                    ? "text-white font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-container)]"
                }`}
                style={
                  sentimentFilter === filter.key
                    ? { background: filter.key === "positive" ? C_POS : filter.key === "negative" ? C_NEG : C_NEU }
                    : {}
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTweets.length > 0 ? (
          <div className="space-y-3">
            {filteredTweets.map((tweet, i) => (
              <TweetCard key={tweet.tweetId} tweet={tweet} index={i} variant="default" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-dashed border-2 border-[var(--border)]"
          >
            <Filter className="w-12 h-12 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Tidak ada tweet dengan sentimen <strong className="text-[var(--text-main)]">{sentimentFilter}</strong>
            </p>
            <Button size="sm" onClick={() => setSentimentFilter("all")} className="font-bold">
              Tampilkan Semua
            </Button>
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
}

/* ── Detail Page ──────────────────────────────────── */
export default function SentimentDetailPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
        <TopBar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center py-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full"
                />
              </div>
            }>
              <DetailContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
