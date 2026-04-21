"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/stores/authStore";

const BACKEND_API = "http://localhost:5000";

export type AnalysisStatus = "idle" | "loading" | "done" | "error";

export type TweetSentiment = "positive" | "neutral" | "negative";

export interface ScrapedTweet {
  tweetId: string;
  text: string;
  username: string;
  name: string;
  views: number;c
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
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const startAnalysis = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery.trim());
    setStatus("loading");
    setMessageIndex(0);
    setResult(null);
    setError(null);

    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % 4);
    }, 2500);

    try {
      const res = await authFetch(`${BACKEND_API}/api/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 50 }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const apiData = await res.json();
      clearInterval(messageInterval);

      // Backend returns { success, message, data: { jobId, status, createdAt, result: { query, total, summary, tweets, topInfluential } } }
      const wrapper = apiData as { success: boolean; message: string; data: { jobId: string; status: string; createdAt: string; result: { query: string; total: number; summary: { positive: number; negative: number; neutral: number }; tweets: Record<string, unknown>[]; topInfluential: Record<string, unknown>[] } } };
      const sentimentResult = wrapper.data.result;
      const { summary, tweets: allTweets, topInfluential } = sentimentResult;

      // Sentiment percentages from backend
      const positive = Math.round(summary.positive);
      const negative = Math.round(summary.negative);
      const neutral = Math.round(summary.neutral);

      // Overall score derived from sentiment balance
      const score = positive >= 50
        ? 65 + Math.round(positive / 3)
        : positive >= 25
        ? 40 + Math.round(positive / 2)
        : 20 + Math.round(positive);

      // Map all tweets from backend
      const tweets: ScrapedTweet[] = (allTweets || []).map((t) => ({
        tweetId: String(t.tweetId || ""),
        text: String(t.text || ""),
        username: String(t.username || ""),
        name: String(t.username || "Unknown"),
        views: Number(t.views) || 0,
        likes: Number(t.likes) || 0,
        retweets: Number(t.retweets) || 0,
        replies: Number(t.replies) || 0,
        sentiment: (t.sentiment as TweetSentiment) || "neutral",
        sentimentScore: Number(t.sentimentScore) || 0,
        influenceScore: Number(t.influenceScore) || 0,
      }));

      // Map top influential tweets
      const topInfluentialMapped: ScrapedTweet[] = (topInfluential || []).map((t) => ({
        tweetId: String(t.tweetId || ""),
        text: String(t.text || ""),
        username: String(t.username || ""),
        name: String(t.username || "Unknown"),
        views: Number(t.views) || 0,
        likes: Number(t.likes) || 0,
        retweets: Number(t.retweets) || 0,
        replies: Number(t.replies) || 0,
        sentiment: (t.sentiment as TweetSentiment) || "neutral",
        sentimentScore: Number(t.sentimentScore) || 0,
        influenceScore: Number(t.influenceScore) || 0,
      }));

      // Build top keywords from all tweet text
      const allText = (allTweets || [])
        .map((t: Record<string, unknown>) => String(t.text || "").toLowerCase())
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

      const finalResult: SentimentResult = {
        jobId: String(wrapper.data.jobId || `job_${Date.now()}`),
        status: String(wrapper.data.status || "completed"),
        createdAt: String(wrapper.data.createdAt || new Date().toISOString()),
        query: String(sentimentResult.query || searchQuery),
        score,
        positive,
        neutral,
        negative,
        total: sentimentResult.total || (allTweets || []).length,
        topKeywords: [searchQuery, ...topWords.slice(0, 4)],
        tweets,
        topInfluential: topInfluentialMapped,
      };

      setResult(finalResult);
      setStatus("done");
    } catch (err: unknown) {
      clearInterval(messageInterval);
      const message = err instanceof Error ? err.message : "Gagal mengambil data dari server.";
      setError("Gagal mengambil data. Coba lagi ya.");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessageIndex(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    messageIndex,
    result,
    error,
    query,
    startAnalysis,
    reset,
    trendingKeywords: TRENDING_KEYWORDS,
  };
}
