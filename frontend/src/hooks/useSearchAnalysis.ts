"use client";

test123

import { useState, useCallback, useRef } from "react";
import { authFetch } from "@/stores/authStore";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type TweetSentiment = "positive" | "neutral" | "negative";

export interface ScrapedTweet {
  tweetId: string;
  text: string;
  username: string;
  name: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  sentiment: TweetSentiment;
  sentimentScore: number;
  influenceScore: number;
}

export interface SentimentResult {
  jobId: string;
  status: string;
  createdAt: string;
  query: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  topKeywords: string[];
  tweets: ScrapedTweet[];
  topInfluential: ScrapedTweet[];
}

const TRENDING_KEYWORDS = [
  "iPhone 15", "AI Technology", "Bitcoin", "Tesla", "OpenAI",
  "Samsung Galaxy", "Meta AI", "React", "Crypto", "NFT",
];

export function useSearchAnalysis() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track the last analyzed query — survives re-renders so we don't re-fetch the same query
  const completedQueryRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Skip if already successfully analyzed this exact query
    if (completedQueryRef.current === trimmed && result !== null) return;

    // Abort any in-flight request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    completedQueryRef.current = trimmed;
    setResult(null);
    setError(null);
    setStatus("loading");

    try {
      const res = await authFetch(`${BACKEND_API}/api/sentiment?q=${encodeURIComponent(trimmed)}&limit=50`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const apiData = await res.json();

      // ── Defensive parsing ─────────────────────────────────────────────
      if (!apiData) {
        throw new Error("Empty response from server.");
      }

      // API wraps in data.result — but the sentiment API returns data directly
      // Both shapes: { data: { result: {...} } }  AND  { data: {...} }
      const raw = apiData.data;
      if (!raw) {
        const msg = apiData.message ?? "Invalid response from server.";
        throw new Error(msg);
      }

      // Unwrap the result layer if present
      const analysisResult = raw.result ?? raw;

      // Summary — fallback to zeros if missing
      const summary = analysisResult.summary ?? {};
      const positive = Math.round(summary.positive ?? 0);
      const negative = Math.round(summary.negative ?? 0);
      const neutral = Math.round(summary.neutral ?? 0);

      const allTweets = analysisResult.tweets ?? [];
      const topInfluential = analysisResult.topInfluential ?? [];

      // Overall score: weighted average (positive=1, neutral=0.5, negative=0) normalized 0-100
      const totalPct = positive + neutral + negative || 1;
      const rawScore = (positive * 1 + neutral * 0.5 + negative * 0) / totalPct;
      const score = Math.round(rawScore * 100);

      // Map all tweets (null-safe)
      // Prefer `id` as the unique key; fall back to composite so duplicates are impossible
      const tweets: ScrapedTweet[] = allTweets.map((t: Record<string, unknown>, idx: number) => ({
        tweetId: String(t.id ?? t.tweetId ?? `tweet_${idx}`),
        text: String(t.text ?? ""),
        username: String(t.username ?? ""),
        name: String(t.name ?? t.username ?? "Unknown"),
        views: Number(t.views) || 0,
        likes: Number(t.likes) || 0,
        retweets: Number(t.retweets) || 0,
        replies: Number(t.replies) || 0,
        sentiment: (t.sentiment as TweetSentiment) || "neutral",
        sentimentScore: Number(t.sentimentScore) || 0,
        influenceScore: Number(t.influenceScore) || 0,
      }));

      // Map top influential tweets (null-safe)
      const topInfluentialMapped: ScrapedTweet[] = topInfluential.map((t: Record<string, unknown>, idx: number) => ({
        tweetId: String(t.id ?? t.tweetId ?? `influential_${idx}`),
        text: String(t.text ?? ""),
        username: String(t.username ?? ""),
        name: String(t.name ?? t.username ?? "Unknown"),
        views: Number(t.views) || 0,
        likes: Number(t.likes) || 0,
        retweets: Number(t.retweets) || 0,
        replies: Number(t.replies) || 0,
        sentiment: (t.sentiment as TweetSentiment) || "neutral",
        sentimentScore: Number(t.sentimentScore) || 0,
        influenceScore: Number(t.influenceScore) || 0,
      }));

      // Build related keywords from tweet text
      const allText = allTweets
        .map((t: Record<string, unknown>) => String(t.text ?? "").toLowerCase())
        .join(" ");
      const words = allText.match(/\b[a-z]{5,}\b/g) || [];
      const stopWords = new Set([
        "https", "http", "this", "that", "with", "have", "from", "will", "your", "what",
        "just", "about", "they", "would", "could", "their", "there", "been", "were",
        "said", "each", "untuk", "dari", "yang", "dan", "ini", "t.co", "https", "rt @",
        "adalah", "dengan", "pada", "akan", "tidak", "juga", "atau", "sudah", "bisa",
      ]);
      const filtered = words.filter((w: string) => !stopWords.has(w));
      const wordFreq: Record<string, number> = {};
      filtered.forEach((w: string) => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

      const rawKeywords = analysisResult.topKeywords;
      const topKeywords: string[] = Array.isArray(rawKeywords) && rawKeywords.length > 0
        ? rawKeywords
        : [trimmed, ...topWords.slice(0, 4)];

      const finalResult: SentimentResult = {
        jobId: String(raw.id ?? `job_${Date.now()}`),
        status: String(raw.status ?? "completed"),
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
        query: String(analysisResult.query ?? trimmed),
        score,
        positive,
        neutral,
        negative,
        total: analysisResult.total ?? allTweets.length,
        topKeywords,
        tweets,
        topInfluential: topInfluentialMapped,
      };

      setResult(finalResult);
      setStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled — silently ignore
        return;
      }
      const message = err instanceof Error
        ? (err.message || "Gagal mengambil data dari server.")
        : "Gagal mengambil data. Coba lagi ya.";
      setError(message);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    completedQueryRef.current = null;
    setResult(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    status,
    result,
    error,
    startAnalysis,
    reset,
    trendingKeywords: TRENDING_KEYWORDS,
  };
}
