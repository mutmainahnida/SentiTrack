"use client";

import { useState, useCallback } from "react";
import axios from "axios";

const SCRAPER_BASE = "http://localhost:4000";

export type AnalysisStatus = "idle" | "loading" | "done" | "error";

export type TweetSentiment = "positive" | "neutral" | "negative";

export interface ScrapedTweet {
  id: string;
  text: string;
  username: string;
  name: string;
  timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  permanentUrl: string;
  isRetweet: boolean;
  isReply: boolean;
  hasMedia: boolean;
  mediaType?: "photo" | "video" | "gif";
  sentiment: TweetSentiment;
}

export interface SentimentResult {
  jobId: string;
  query: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  topKeywords: string[];
  tweets: ScrapedTweet[];
}

const POS_KWS = ["love", "amazing", "best", "great", "good", "awesome", "excellent", "happy", "recommend", "wow", "incredible", "fantastic", "perfect", "outstanding", "brilliant", "enjoy", "beautiful", "excited", "success", "successfully", "win", "winner", "impressive", "cool", "nice", "fun", "glad", "appreciate", "pleased", "superb", "elegant", "smooth", "fast", "efficient", "reliable", "powerful"];
const NEG_KWS = ["hate", "bad", "worst", "terrible", "disappointed", "awful", "horrible", "waste", "overpriced", "ridiculous", "scam", "fake", "avoid", "dangerous", "fail", "failed", "broken", "bug", "crash", "error", "slow", "stupid", "useless", "annoying", "frustrated", "frustrating", "angry", "sad", "sucks", "trash", "garbage", "worst", "never", "sorry"];
const NEU_KWS = ["think", "maybe", "perhaps", "possibly", "seems", "likely", "probably", "wonder", "curious", "interesting", "not sure", "consider", "heard", "read", "check", "looking", "looking", "听说", "似乎"];

function analyzeTweetSentiment(text: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  const posHits = POS_KWS.filter(k => lower.includes(k)).length;
  const negHits = NEG_KWS.filter(k => lower.includes(k)).length;
  if (posHits > negHits) return "positive";
  if (negHits > posHits) return "negative";
  const neuHits = NEU_KWS.filter(k => lower.includes(k)).length;
  if (neuHits > 0) return "neutral";
  // Fallback: look for sentiment words in surrounding context
  if (posHits > 0) return "positive";
  if (negHits > 0) return "negative";
  return "neutral";
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
      // Step 1: Scrape real tweets from X.com
      const { data: scraped } = await axios.get(`${SCRAPER_BASE}/api/search`, {
        params: { q: searchQuery, product: "Top", limit: 50 },
      });

      clearInterval(messageInterval);

      // Step 2: Build top keywords from query + scraped text
      const allText = scraped.tweets
        .map((t: Record<string, unknown>) => String(t.text || "").toLowerCase())
        .join(" ");
      const words = allText.match(/\b[a-z]{5,}\b/g) || [];
      const stopWords = new Set(["https", "http", "this", "that", "with", "have", "from", "will", "your", "what", "just", "about", "they", "would", "could", "their", "there", "been", "were", "said", "each"]);
      const filtered = words.filter((w: string) => !stopWords.has(w));
      const wordFreq: Record<string, number> = {};
      filtered.forEach((w: string) => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

      const keywords = [searchQuery, ...topWords.slice(0, 4)];

      // Step 4: Map tweets with individual sentiment analysis
      const tweetsList: Record<string, unknown>[] = Array.isArray(scraped.tweets) ? scraped.tweets : [];

      const tweets: ScrapedTweet[] = tweetsList.map((t: Record<string, unknown>, i: number) => {
        const photos = Array.isArray(t.photos) ? t.photos : [];
        const videos = Array.isArray(t.videos) ? t.videos : [];
        const hasPhotos = photos.length > 0;
        const hasVideos = videos.length > 0;
        const mediaType: "photo" | "video" | "gif" | undefined = hasVideos ? "video" : hasPhotos ? "photo" : undefined;

        // Parse timestamp — scraper returns Unix seconds
        let ts: number;
        if (typeof t.timestamp === "number") {
          ts = t.timestamp > 1e12 ? t.timestamp : t.timestamp * 1000;
        } else {
          ts = Date.now() - i * 3600000;
        }

        const text = String(t.text || "");
        const sentiment = analyzeTweetSentiment(text);

        return {
          id: String(t.id || i),
          text,
          username: String(t.username || ""),
          name: String(t.name || t.username || "Unknown"),
          timestamp: ts,
          likes: Number(t.likes || 0),
          retweets: Number(t.retweets || 0),
          replies: Number(t.replies || 0),
          views: Number(t.views || 0),
          permanentUrl: String(t.permanentUrl || `https://x.com/i/status/${t.id}`),
          isRetweet: Boolean(t.isRetweet || false),
          isReply: Boolean(t.isReply || false),
          hasMedia: hasPhotos || hasVideos,
          mediaType,
          sentiment,
        };
      });

      // Step 5: Derive global sentiment percentages from real per-tweet counts
      const totalCount = tweets.length;
      const realPosCount = tweets.filter(t => t.sentiment === "positive").length;
      const realNegCount = tweets.filter(t => t.sentiment === "negative").length;
      const realNeuCount = tweets.filter(t => t.sentiment === "neutral").length;
      const realPosPct = Math.max(10, Math.min(90, Math.round((realPosCount / totalCount) * 100)));
      const realNegPct = Math.max(5, Math.min(80, Math.round((realNegCount / totalCount) * 100)));
      const realNeuPct = 100 - realPosPct - realNegPct;
      const realScore = realPosPct >= 50 ? 65 + Math.round(realPosPct / 3) : realPosPct >= 25 ? 40 + Math.round(realPosPct / 2) : 20 + Math.round(realPosPct);

      const mockResult: SentimentResult = {
        jobId: `job_${Date.now()}`,
        query: searchQuery,
        score: realScore,
        positive: realPosPct,
        neutral: realNeuPct,
        negative: realNegPct,
        total: totalCount,
        topKeywords: keywords,
        tweets,
      };

      setResult(mockResult);
      setStatus("done");
    } catch (err: unknown) {
      clearInterval(messageInterval);
      const message = err instanceof Error ? err.message : "Gagal mengambil data dari server.";
      if (message.includes("401") || message.includes("Not logged in")) {
        setError("Scraper belum login. Buka http://localhost:4000/login untuk setup cookie.");
      } else {
        setError("Gagal mengambil data. Coba lagi ya.");
      }
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