"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/stores/authStore";
import type { TweetSentiment, ScrapedTweet } from "./useSearchAnalysis";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/* ── Raw result shape from DB ──────────────────────────── */
interface RawResultSnapshot {
  query: string;
  total: number;
  summary: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topInfluential: RawTweet[];
  tweets: RawTweet[];
  completedAt: string;
}

interface RawTweet {
  tweetId: string;
  text: string;
  username: string;
  views?: number;
  likes?: number;
  retweets?: number;
  replies?: number;
  sentiment?: TweetSentiment;
  sentimentScore?: number;
  influenceScore?: number;
}

/* ── API response from GET /api/sentiment/history/:jobId ─ */
export interface HistoryDetailItem {
  jobId: string;
  query: string;
  product: string;
  total: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  result: RawResultSnapshot | null;
}

/* ── Mapped display shape ─────────────────────────────── */
export interface MappedTweet extends ScrapedTweet {
  sentimentLabel: "Positive" | "Neutral" | "Negative";
}

function mapTweet(raw: RawTweet, idx: number): MappedTweet {
  const sentiment = raw.sentiment ?? "neutral";
  return {
    tweetId: String(raw.tweetId ?? `tweet_${idx}`),
    text: String(raw.text ?? ""),
    username: String(raw.username ?? ""),
    name: String(raw.username ?? "Unknown"),
    views: Number(raw.views) || 0,
    likes: Number(raw.likes) || 0,
    retweets: Number(raw.retweets) || 0,
    replies: Number(raw.replies) || 0,
    sentiment,
    sentimentScore: Number(raw.sentimentScore) || 0,
    influenceScore: Number(raw.influenceScore) || 0,
    sentimentLabel:
      sentiment === "positive"
        ? "Positive"
        : sentiment === "negative"
        ? "Negative"
        : "Neutral",
  };
}

function computeScore(positive: number, negative: number, neutral: number): number {
  const total = positive + negative + neutral || 1;
  return Math.round(((positive * 1 + neutral * 0.5 + negative * 0) / total) * 100);
}

export interface MappedHistoryDetail {
  jobId: string;
  query: string;
  product: string;
  total: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  score: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  tweets: MappedTweet[];
  topInfluential: MappedTweet[];
  allKeywords: string[];
  completedAtDisplay: string;
  createdAtDisplay: string;
}

function mapDetail(raw: HistoryDetailItem): MappedHistoryDetail | null {
  if (!raw) return null;

  const result = raw.result;
  const summary = result?.summary ?? {
    positive: raw.positivePct,
    negative: raw.negativePct,
    neutral: raw.neutralPct,
  };

  const allTweets = (result?.tweets ?? []).map(mapTweet);
  const topInfluential = (result?.topInfluential ?? []).map(mapTweet);

  // Extract keywords from tweet text
  const allText = allTweets
    .map((t) => t.text.toLowerCase())
    .join(" ");
  const words = allText.match(/\b[a-z]{5,}\b/g) || [];
  const stopWords = new Set([
    "https", "http", "this", "that", "with", "have", "from", "will", "your", "what",
    "just", "about", "they", "would", "could", "their", "there", "been", "were",
    "said", "each", "untuk", "dari", "yang", "dan", "ini", "t.co", "adalah",
    "dengan", "pada", "akan", "tidak", "juga", "atau", "sudah", "bisa", "ada",
  ]);
  const filtered = words.filter((w) => !stopWords.has(w));
  const wordFreq: Record<string, number> = {};
  filtered.forEach((w) => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const allKeywords = result
    ? [...new Set([raw.query, ...topWords])]
    : [raw.query];

  return {
    jobId: raw.jobId,
    query: raw.query,
    product: raw.product,
    total: raw.total ?? result?.total ?? allTweets.length,
    positivePct: summary.positive,
    negativePct: summary.negative,
    neutralPct: summary.neutral,
    score: computeScore(summary.positive, summary.negative, summary.neutral),
    status: raw.status,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt ?? result?.completedAt ?? null,
    errorMessage: raw.errorMessage,
    tweets: allTweets,
    topInfluential,
    allKeywords,
    completedAtDisplay: raw.completedAt
      ? new Date(raw.completedAt).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: false,
        })
      : "—",
    createdAtDisplay: new Date(raw.createdAt).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }),
  };
}

/* ── Hook ────────────────────────────────────────────── */
export function useSentimentHistoryDetail(jobId: string) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [detail, setDetail] = useState<MappedHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!jobId) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await authFetch(`${BACKEND_API}/api/sentiment/history/${encodeURIComponent(jobId)}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }

      const wrapper = await res.json();
      const raw: HistoryDetailItem = wrapper.data;
      const mapped = mapDetail(raw);

      setDetail(mapped);
      setStatus("done");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? (err.message || "Gagal memuat detail analisis.")
          : "Gagal memuat detail.",
      );
      setStatus("error");
    }
  }, [jobId]);

  return { status, detail, error, fetchDetail };
}
