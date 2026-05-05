"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Repeat2,
  Heart,
  Eye,
} from "lucide-react";
import { useSearchAnalysis, type ScrapedTweet, type SentimentResult } from "@/hooks/useSearchAnalysis";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/* ── Chart colors ──────────────────────────────────────── */
const C_POS = "#22D3EE";
const C_NEU = "#818CF8";
const C_NEG = "#FB7185";
const C_MINT = "#34D399";

/* ── Helpers ─────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h lalu`;
  return `${Math.floor(hr / 24)}d lalu`;
}

/* ── Sentiment Pie Chart ─────────────────────────────── */
function SentimentPie({ result }: { result: SentimentResult }) {
  const posCount = Math.round((result.positive / 100) * result.total);
  const neuCount = Math.round((result.neutral / 100) * result.total);
  const negCount = Math.round((result.negative / 100) * result.total);

  const data = [
    { name: "Positive", value: result.positive, count: posCount, color: C_POS },
    { name: "Neutral",  value: result.neutral,  count: neuCount, color: C_NEU },
    { name: "Negative", value: result.negative, count: negCount, color: C_NEG },
  ];
  return (
    <div className="flex items-center gap-6">
      <div style={{ width: 130, height: 130, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-[var(--text-main)]">{result.score}</span>
          <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">/100</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">{d.name}</span>
                <span className="text-sm font-bold text-[var(--text-main)]">{d.value}%</span>
                <span className="text-xs text-[var(--text-muted)]">({d.count.toLocaleString()})</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                  initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
              </div>
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
    ? [C_MINT, "High"]
    : score >= 40
    ? [C_NEU, "Mixed"]
    : [C_NEG, "Low"];
  return (
    <Badge className="text-xs font-bold border-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label} Sentiment
    </Badge>
  );
}

/* ── Keyword Tag ─────────────────────────────────── */
function KeywordTag({ kw, onClick }: { kw: string; onClick: (k: string) => void }) {
  return (
    <button onClick={() => onClick(kw)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all duration-200">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      {kw}
    </button>
  );
}

/* ── Tweet Card ──────────────────────────────────── */
function TweetCard({ tweet, index }: { tweet: ScrapedTweet; index: number }) {
  const sentimentColor = tweet.sentiment === "positive" ? C_POS
    : tweet.sentiment === "negative" ? C_NEG : C_NEU;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden"
    >
      <div className="flex gap-0">
        {/* Sentiment accent bar */}
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: sentimentColor }} />
        <div className="flex-1 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)] leading-tight">{tweet.name}</p>
                <p className="text-xs text-[var(--text-muted)]">@{tweet.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className="text-[10px] font-bold border-0"
                style={{ background: `${sentimentColor}15`, color: sentimentColor, border: `1px solid ${sentimentColor}25` }}>
                {tweet.sentiment.charAt(0).toUpperCase() + tweet.sentiment.slice(1)}
              </Badge>
              <a href={`https://x.com/i/status/${tweet.tweetId}`} target="_blank" rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
          {/* Text */}
          <p className="text-sm text-[var(--text-main)] leading-relaxed mb-4 line-clamp-3">{tweet.text}</p>
          {/* Stats row — Lucide icons */}
          <div className="flex items-center gap-5 text-[var(--text-muted)]">
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Empty / Error ───────────────────────────────── */
function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full min-h-[500px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      {/* Neural grid background */}
      <div className="absolute inset-0 opacity-[0.03] neural-grid" />

      {/* Floating gradient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${C_POS}40, transparent 70%)` }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${C_NEU}30, transparent 70%)` }}
      />

      {/* Content */}
      <div className="relative h-full flex items-center">
        {/* Left side - Visual */}
        <div className="flex-1 pl-16 pr-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative"
          >
            {/* Animated AI bot — static SVG, CSS animations only */}
            <svg className="w-full max-w-[340px] mx-auto" viewBox="0 0 280 320" fill="none">
              {/* Glow behind bot */}
              <ellipse cx="140" cy="300" rx="60" ry="8"
                fill={C_POS} opacity="0.15" />

              {/* Antenna line */}
              <line x1="140" y1="40" x2="140" y2="20"
                stroke={C_POS} strokeWidth="3" strokeLinecap="round" />
              <circle cx="140" cy="14" r="7"
                fill={C_POS} opacity="0.8" className="animate-pulse" />

              {/* Head */}
              <rect x="80" y="40" width="120" height="100" rx="24"
                fill={`${C_POS}08`} stroke={C_POS} strokeWidth="2.5" />

              {/* Face screen */}
              <rect x="92" y="54" width="96" height="72" rx="14"
                fill={`${C_NEU}15`} stroke={`${C_NEU}40`} strokeWidth="1.5" />

              {/* Eyes — static */}
              <circle cx="116" cy="86" r="9" fill={C_POS} opacity="0.9" />
              <circle cx="164" cy="86" r="9" fill={C_POS} opacity="0.9" />
              {/* Eye inner highlight */}
              <circle cx="120" cy="82" r="3" fill="white" opacity="0.6" />
              <circle cx="168" cy="82" r="3" fill="white" opacity="0.6" />

              {/* Mouth — static waveform */}
              <path
                d="M116 108 Q124 114 132 108 Q140 102 148 108 Q156 114 164 108"
                stroke={C_NEU} strokeWidth="2.5" fill="none" strokeLinecap="round"
              />

              {/* Neck */}
              <rect x="120" y="140" width="40" height="18" rx="9"
                fill={`${C_NEU}20`} stroke={`${C_NEU}40`} strokeWidth="1.5" />

              {/* Body */}
              <rect x="70" y="158" width="140" height="110" rx="28"
                fill={`${C_NEU}08`} stroke={`${C_NEU}30`} strokeWidth="2" />

              {/* Chest panel lines */}
              <line x1="100" y1="184" x2="180" y2="184" stroke={`${C_POS}40`} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="100" y1="196" x2="180" y2="196" stroke={`${C_POS}25`} strokeWidth="1.5" strokeLinecap="round" />

              {/* Chest progress bars — static */}
              {[
                { y: 208, w: 100, color: C_POS },
                { y: 222, w: 72, color: C_NEU },
                { y: 236, w: 88, color: C_MINT },
              ].map((bar, i) => (
                <rect key={i}
                  x="100" y={bar.y} width={bar.w} height="6" rx="3"
                  fill={bar.color}
                />
              ))}

              {/* Side arms — static */}
              <rect x="40" y="165" width="24" height="60" rx="12"
                fill={`${C_POS}10`} stroke={`${C_POS}30`} strokeWidth="1.5" />
              <rect x="216" y="165" width="24" height="60" rx="12"
                fill={`${C_POS}10`} stroke={`${C_POS}30`} strokeWidth="1.5" />

              {/* Floating particles — static */}
              {[
                { cx: 52, cy: 100, r: 4, color: C_POS },
                { cx: 228, cy: 80, r: 3, color: C_NEU },
                { cx: 48, cy: 240, r: 3.5, color: C_MINT },
                { cx: 232, cy: 230, r: 4, color: C_NEG },
              ].map((p, i) => (
                <circle key={i}
                  cx={p.cx} cy={p.cy} r={p.r}
                  fill={p.color} opacity="0.7"
                />
              ))}
            </svg>
          </motion.div>
        </div>

        {/* Right side - Content */}
        <div className="flex-1 pl-8 pr-16 py-12">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6"
          >
            {/* Search icon badge */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${C_POS}15, ${C_NEU}15)`,
                border: `1px solid ${C_POS}30`,
              }}
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={C_POS} strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <path d="M11 8v6M8 11h6" className="opacity-60" />
              </svg>
            </motion.div>

            {/* Text */}
            <div className="space-y-3">
              <h2 className="text-3xl font-black font-display text-[var(--text-main)] leading-tight">
                Neural AI
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
                  Ready to Analyze
                </span>
              </h2>
              <p className="text-base text-[var(--text-muted)] leading-relaxed max-w-md">
                Masukkan keyword dan ketik <strong className="text-[var(--primary)] font-semibold">Analyze</strong> untuk memulai.
              </p>
            </div>

            {/* Query pill */}
            {query && query !== "..." && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: `${C_POS}10`, border: `1px solid ${C_POS}25`, color: C_POS }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>&quot;{query}&quot;</span>
              </motion.div>
            )}

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { label: "Real-time Analysis", color: C_POS },
                { label: "Sentiment Scoring", color: C_NEU },
                { label: "Trend Detection", color: C_NEG },
              ].map((pill, i) => (
                <motion.div
                  key={pill.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{
                    background: `${pill.color}08`,
                    borderColor: `${pill.color}20`,
                    color: pill.color,
                  }}
                >
                  {pill.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${C_POS}, ${C_NEU}, ${C_NEG})` }}
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
      />
    </motion.div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full min-h-[400px] rounded-3xl border border-red-500/20 bg-[var(--surface)] overflow-hidden"
    >
      {/* Subtle red glow background */}
      <motion.div
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${C_NEG}15, transparent 60%)` }}
      />

      <div className="relative h-full flex flex-col items-center justify-center py-20 px-10 gap-8">
        {/* Error icon */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: `${C_NEG}12`, border: `2px solid ${C_NEG}30` }}
        >
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={C_NEG} strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </motion.div>

        {/* Content */}
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black font-display text-[var(--text-main)]">Analysis Failed</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">{message}</p>
        </div>

        {/* Action */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${C_NEG}, ${C_NEU})` }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
          </svg>
          Retry Analysis
        </motion.button>

        {/* Bottom accent */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${C_NEG}, transparent)` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
}

/* ── Search Page ─────────────────────────────────── */
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(urlQuery);

  const { status, result, error, startAnalysis } = useSearchAnalysis();

  useEffect(() => {
    if (urlQuery && status === "idle") {
      void startAnalysis(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = (kw?: string) => {
    const q = (kw ?? searchValue).trim();
    if (!q) return;
    if (kw) setSearchValue(kw);
    void startAnalysis(q);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
        <TopBar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full">

            {/* ── Header: title + search + export ──────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black font-display text-[var(--text-main)] tracking-tight">Neural Analysis</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {result
                    ? `"${result.query}" · ${result.total.toLocaleString()} tweets · ${timeAgo(result.createdAt)}`
                    : "Analisis sentimen Twitter secara real-time"}
                </p>
              </div>
              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] overflow-hidden flex items-center focus-within:border-[var(--primary)] transition-colors">
                  <svg className="w-4 h-4 ml-4 text-[var(--text-muted)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <Input
                    type="text"
                    placeholder="Topik, brand, atau keyword..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                    disabled={status === "loading"}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm p-2.5 h-9 w-52"
                  />
                  <Button size="sm" onClick={() => handleAnalyze()}
                    disabled={status === "loading" || !searchValue.trim()}
                    className="mr-1.5 h-7 px-4 rounded-lg text-xs font-bold">
                    {status === "loading" ? "..." : "Analisis"}
                  </Button>
                </div>
                {result && (
                  <Button variant="outline" size="sm"
                    onClick={() => router.push("/dashboard")}
                    className="border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium flex-shrink-0">
                    <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                  </Button>
                )}
              </div>
            </div>

            {/* ── Loading ────────────────────────────────────── */}
            {status === "loading" && (
              <div className="flex items-center justify-center py-32">
                <LoadingAnimation />
              </div>
            )}

            {/* ── Error ──────────────────────────────────────── */}
            {status === "error" && (
              <ErrorState message={error ?? "Terjadi kesalahan."} onRetry={() => handleAnalyze()} />
            )}

            {/* ── Idle ──────────────────────────────────────── */}
            {status === "idle" && !urlQuery && (
              <EmptyState query={searchValue || "..."} />
            )}

            {/* ── Results ───────────────────────────────────── */}
            <AnimatePresence>
              {status === "done" && result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* KPI row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Overall Score", value: result.score, suffix: "/100", color: C_MINT },
                      { label: "Total Tweets", value: result.total.toLocaleString(), suffix: "", color: C_POS },
                      { label: "Positive", value: `${result.positive}%`, suffix: "", color: C_POS },
                      { label: "Negative", value: `${result.negative}%`, suffix: "", color: C_NEG },
                    ].map((kpi, i) => (
                      <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5"
                      >
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{kpi.label}</p>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-black text-[var(--text-main)] leading-none">{kpi.value}</span>
                          <span className="text-sm font-medium text-[var(--text-muted)] mb-0.5">{kpi.suffix}</span>
                        </div>
                        <div className="mt-3 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: kpi.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${result.score}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Distribution card */}
                  <div className="grid grid-cols-1">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="bg-[var(--surface)] border border-[var(--border)]">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-[var(--text-main)]">Distribusi Sentimen</CardTitle>
                            <ScoreBadge score={result.score} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <SentimentPie result={result} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Keywords */}
                  {result.topKeywords.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="bg-[var(--surface)] border border-[var(--border)]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold text-[var(--text-main)]">Top Keywords</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {result.topKeywords.map((kw) => (
                              <KeywordTag key={kw} kw={kw} onClick={handleAnalyze} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Tweets */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-[var(--text-main)]">
                        Hasil Analisis
                        <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({result.tweets.length} tweets)</span>
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {result.tweets.map((tweet, i) => (
                        <TweetCard key={tweet.tweetId} tweet={tweet} index={i} />
                      ))}
                    </div>
                  </motion.div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full"
        />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
