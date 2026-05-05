"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Download,
  History,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useSentimentHistory } from "@/hooks/useSentimentHistory";
import type { HistoryItem } from "@/hooks/useSentimentHistory";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const C_POS = "#22D3EE";
const C_NEU = "#818CF8";
const C_NEG = "#FB7185";
const C_MINT = "#34D399";

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h lalu`;
  return `${Math.floor(hr / 24)}d lalu`;
}

/* ── Sentiment Mix ─────────────────────────────────── */
function SentimentMix({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C_POS }} title={`Positive: ${positive}%`} />
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C_NEU }} title={`Neutral: ${neutral}%`} />
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C_NEG }} title={`Negative: ${negative}%`} />
      </div>
      <span className="text-[10px] font-bold text-[var(--text-muted)] tabular-nums">
        {positive}/{neutral}/{negative}
      </span>
    </div>
  );
}

/* ── Score Badge ─────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  const [color, label] = score >= 70
    ? [C_MINT, "Positive"]
    : score >= 40
    ? [C_NEU, "Neutral"]
    : [C_NEG, "Negative"];
  return (
    <Badge className="text-[10px] font-bold border-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </Badge>
  );
}

/* ── History Card ─────────────────────────────────── */
function HistoryCard({ item, onView, onReanalyze }: {
  item: HistoryItem;
  onView: () => void;
  onReanalyze: () => void;
}) {
  const score = Math.round((item.positivePct * 1 + item.neutralPct * 0.5 + item.negativePct * 0) / 100 * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                onClick={() => onReanalyze()}
                className="text-sm font-bold text-[var(--text-main)] hover:text-[var(--primary)] cursor-pointer transition-colors truncate"
              >
                {item.query}
              </h3>
              <ScoreBadge score={score} />
            </div>
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider">{item.total.toLocaleString()} tweets</span>
              <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
              <div className="flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" />
                <span>{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onView}
              className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90"
            >
              <Eye className="w-3 h-3 mr-1" />
              Detail
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <SentimentMix positive={item.positivePct} neutral={item.neutralPct} negative={item.negativePct} />

          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <span className="text-[10px] font-semibold">{formatDate(item.createdAt)}</span>
            <span className="text-[9px] opacity-60">{formatTime(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Pagination ───────────────────────────────────── */
function Pagination({
  page, totalPages, onNext, onPrev, onPage
}: {
  page: number;
  totalPages: number;
  onNext: () => void;
  onPrev: () => void;
  onPage: (p: number) => void;
}) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
            page === p
              ? "bg-[var(--primary)] text-white"
              : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-main)]"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── History Page ─────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const [filter, setFilter] = useState("");

  const { items, loading, error, page, totalPages, total, fetchHistory } =
    useSentimentHistory();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) void fetchHistory(1);
  }, [isAuthenticated]);

  const filteredItems = filter
    ? items.filter((item) => item.query.toLowerCase().includes(filter.toLowerCase()))
    : items;

  if (!isHydrated || !isAuthenticated) return null;

  const avgScore = filteredItems.length > 0
    ? Math.round(
        filteredItems.reduce(
          (sum, item) =>
            sum +
            Math.round((item.positivePct * 1 + item.neutralPct * 0.5 + item.negativePct * 0) / 100 * 100),
          0,
        ) / filteredItems.length,
      )
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-16 xl:pl-64">
        <TopBar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full flex flex-col gap-6">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-black font-display text-[var(--text-main)] tracking-tight mb-1">Analysis History</h1>
              <p className="text-sm text-[var(--text-muted)]">Lihat semua riwayat analisis sentimen</p>
            </div>

            {/* KPI Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-[var(--surface)] border border-[var(--border)]">
                <CardContent className="p-5">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Total Analisis</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-[var(--text-main)] leading-none">{total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[var(--surface)] border border-[var(--border)]">
                <CardContent className="p-5">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Avg. Score</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-[var(--text-main)] leading-none">{avgScore}</span>
                    <span className="text-sm font-medium text-[var(--text-muted)] mb-0.5">/100</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: avgScore >= 65 ? C_MINT : avgScore >= 40 ? C_NEU : C_NEG }}
                      initial={{ width: 0 }}
                      animate={{ width: `${avgScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[var(--surface)] border border-[var(--border)]">
                <CardContent className="p-5">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Filter</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Cari keyword..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* History List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full"
                />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--border)] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{error}</p>
                <Button size="sm" onClick={() => void fetchHistory(page)} className="font-bold">
                  Coba Lagi
                </Button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--border)] flex items-center justify-center">
                  <History className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {filter ? "Tidak ada hasil untuk filter tersebut." : "Belum ada riwayat analisis."}
                </p>
                {!filter && (
                  <Button size="sm" onClick={() => router.push("/dashboard")} className="font-bold">
                    Mulai Analisis
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <HistoryCard
                      key={item.jobId}
                      item={item}
                      onView={() => router.push(`/history/detail/${item.jobId}`)}
                      onReanalyze={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onNext={() => {
                        if (page < totalPages) void fetchHistory(page + 1);
                      }}
                      onPrev={() => {
                        if (page > 1) void fetchHistory(page - 1);
                      }}
                      onPage={(p) => void fetchHistory(p)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
