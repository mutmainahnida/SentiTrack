"use client";

import { useState, useCallback } from "react";
import axios from "axios";

const BACKEND_API = "http://localhost:5000";

export type TweetSentiment = "positive" | "neutral" | "negative";

export interface HistoryItem {
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
  result: {
    query: string;
    total: number;
    tweets?: unknown[];
    topInfluential?: unknown[];
  } | null;
}

export interface HistoryResponse {
  data: HistoryItem[];
  pagination: {
    page: number;
    take: number;
    total: number;
    totalPages: number;
  };
}

export interface HistoryStats {
  totalScans: number;
  avgSentiment: number;
  peakHour: string;
}

export function computeOverallScore(positive: number, negative: number, neutral: number): number {
  const total = positive + negative + neutral;
  if (total === 0) return 50;
  const posPct = (positive / total) * 100;
  if (posPct >= 50) return 65 + Math.round(posPct / 3);
  if (posPct >= 25) return 40 + Math.round(posPct / 2);
  return 20 + Math.round(posPct);
}

export function computeAvgSentiment(items: HistoryItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    return sum + computeOverallScore(
      item.positivePct,
      item.negativePct,
      item.neutralPct,
    );
  }, 0);
  return Math.round(total / items.length);
}

export function computePeakHour(items: HistoryItem[]): string {
  if (items.length === 0) return "--:--";
  const hourCounts: Record<number, number> = {};
  for (const item of items) {
    const date = new Date(item.createdAt);
    const utcHour = date.getUTCHours();
    const wibHour = (utcHour + 7) % 24;
    hourCounts[wibHour] = (hourCounts[wibHour] || 0) + 1;
  }
  const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  return `${String(peak[0]).padStart(2, "0")}:00 WIB`;
}

export function useSentimentHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");

  const fetchHistory = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<HistoryResponse>(
        `${BACKEND_API}/api/sentiment`,
        {
          params: { page: pageNum, take: 20 },
        },
      );
      setItems(data.data);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      setError("Gagal memuat riwayat analisis.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredItems = filter
    ? items.filter((item) =>
        item.query.toLowerCase().includes(filter.toLowerCase()),
      )
    : items;

  return {
    items: filteredItems,
    loading,
    error,
    page,
    totalPages,
    total,
    filter,
    setFilter,
    fetchHistory,
    setPage,
  };
}
