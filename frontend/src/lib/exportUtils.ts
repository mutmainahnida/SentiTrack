"use client";

import type { SentimentResult } from "@/hooks/useSearchAnalysis";

/* ── CSV Export ─────────────────────────────────── */
export function exportCSV(result: SentimentResult) {
  const headers = [
    "No",
    "Tweet ID",
    "Username",
    "Name",
    "Text",
    "Sentiment",
    "Sentiment Score",
    "Influence Score",
    "Likes",
    "Retweets",
    "Replies",
    "Views",
  ];

  const rows = result.tweets.map((tweet, idx) => [
    idx + 1,
    tweet.tweetId,
    tweet.username,
    tweet.name,
    `"${tweet.text.replace(/"/g, '""')}"`,
    tweet.sentiment,
    tweet.sentimentScore.toFixed(3),
    tweet.influenceScore.toFixed(3),
    tweet.likes,
    tweet.retweets,
    tweet.replies,
    tweet.views,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const bom = "﻿";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sentiment_${result.query.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── PDF Export (client-side via jsPDF) ──────────── */
export async function exportPDF(result: SentimentResult) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const bottomMargin = 20;
  let y = margin;

  // Colours
  const C_POS = [34, 211, 238] as [number, number, number];
  const C_NEU = [129, 140, 248] as [number, number, number];
  const C_NEG = [251, 113, 133] as [number, number, number];
  const C_HEADER_BG = [15, 23, 42] as [number, number, number];
  const C_CARD_BG = [248, 250, 252] as [number, number, number];
  const C_ROW_ALT = [248, 250, 252] as [number, number, number];
  const C_GREY = [100, 116, 139] as [number, number, number];
  const C_GREY_LIGHT = [180, 180, 180] as [number, number, number];
  const C_DIVIDER = [226, 232, 240] as [number, number, number];

  const sentimentColor = (sentiment: string): [number, number, number] => {
    if (sentiment === "positive") return C_POS;
    if (sentiment === "negative") return C_NEG;
    return C_NEU;
  };

  // ── Helper: set fill + text color in one call ──
  const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

  // ── Helper: draw text, returns actual height used ──
  const write = (
    text: string,
    x: number,
    yPos: number,
    opts?: {
      fontSize?: number;
      bold?: boolean;
      color?: [number, number, number];
      maxWidth?: number;
    }
  ): number => {
    const fs = opts?.fontSize ?? 9;
    const maxW = opts?.maxWidth;
    doc.setFontSize(fs);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) {
      doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    let result;
    if (maxW) {
      const lines = doc.splitTextToSize(text, maxW);
      const dims = doc.getTextDimensions(lines[0]);
      doc.text(lines, x, yPos);
      doc.setTextColor(0, 0, 0);
      return (dims.h + 1) * lines.length;
    } else {
      doc.text(text, x, yPos);
      doc.setTextColor(0, 0, 0);
      return fs * 0.3525 + 1; // approx line height in mm
    }
  };

  // ── Helper: draw a horizontal divider ──
  const divider = (yPos: number, color = C_DIVIDER) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageW - margin, yPos);
  };

  // ═══════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════
  doc.setFillColor(C_HEADER_BG[0], C_HEADER_BG[1], C_HEADER_BG[2]);
  doc.rect(0, 0, pageW, 32, "F");

  // Brand name
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("SentiTrack", margin, 13);

  // Brand subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C_GREY_LIGHT[0], C_GREY_LIGHT[1], C_GREY_LIGHT[2]);
  doc.text("Sentiment Analysis Report", margin, 19);

  // Generated date
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, margin, 25);

  // Right-side info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`"${result.query}"`, pageW - margin, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C_POS[0], C_POS[1], C_POS[2]);
  doc.text(`${result.total.toLocaleString()} tweets analyzed`, pageW - margin, 19, { align: "right" });
  doc.setTextColor(0, 0, 0);

  y = 38;

  // ═══════════════════════════════════════════════════
  // SUMMARY CARD
  // ═══════════════════════════════════════════════════
  const cardH = 34;
  doc.setFillColor(C_CARD_BG[0], C_CARD_BG[1], C_CARD_BG[2]);
  doc.roundedRect(margin, y, contentW, cardH, 3, 3, "F");
  doc.setDrawColor(C_DIVIDER[0], C_DIVIDER[1], C_DIVIDER[2]);
  doc.setLineWidth(0.3);

  const colW = contentW / 4;

  // Overall score (column 0)
  write("Overall Score", margin + 6, y + 8, { fontSize: 7.5, color: C_GREY });
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C_POS[0], C_POS[1], C_POS[2]);
  doc.text(`${result.score}`, margin + 6, y + 20);
  doc.setFontSize(10);
  doc.setTextColor(C_GREY[0], C_GREY[1], C_GREY[2]);
  doc.text("/100", margin + 6 + (String(result.score).length * 6) + 1, y + 20);

  // Divider 1
  doc.line(margin + colW, y + 4, margin + colW, y + cardH - 4);

  // Positive (column 1)
  write("Positive", margin + colW + 6, y + 8, { fontSize: 7.5, color: C_GREY });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C_POS[0], C_POS[1], C_POS[2]);
  doc.text(`${result.positive}%`, margin + colW + 6, y + 20);

  // Divider 2
  doc.line(margin + colW * 2, y + 4, margin + colW * 2, y + cardH - 4);

  // Neutral (column 2)
  write("Neutral", margin + colW * 2 + 6, y + 8, { fontSize: 7.5, color: C_GREY });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C_NEU[0], C_NEU[1], C_NEU[2]);
  doc.text(`${result.neutral}%`, margin + colW * 2 + 6, y + 20);

  // Divider 3
  doc.line(margin + colW * 3, y + 4, margin + colW * 3, y + cardH - 4);

  // Negative (column 3)
  write("Negative", margin + colW * 3 + 6, y + 8, { fontSize: 7.5, color: C_GREY });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C_NEG[0], C_NEG[1], C_NEG[2]);
  doc.text(`${result.negative}%`, margin + colW * 3 + 6, y + 20);
  doc.setTextColor(0, 0, 0);

  y += cardH + 10;

  // ═══════════════════════════════════════════════════
  // TOP INFLUENTIAL TWEETS
  // ═══════════════════════════════════════════════════
  if (result.topInfluential.length > 0) {
    write("Top Influential Tweets", margin, y, { fontSize: 11, bold: true });
    y += 7;

    const tweetCardPad = 6;
    const tweetCardX = margin;
    const tweetCardInnerW = contentW;
    const accentW = 3;
    const avatarSize = 10;
    const avatarY_offset = 4; // avatar center offset from card top
    const LINE_H = 4.2; // mm per line

    result.topInfluential.slice(0, 5).forEach((tweet) => {
      const [r, g, b] = sentimentColor(tweet.sentiment);

      // Build text rows to measure
      const usernameTxt = `@${tweet.username}`;
      const sentimentTxt = tweet.sentiment.charAt(0).toUpperCase() + tweet.sentiment.slice(1);
      const scoreTxt = `Score: ${tweet.sentimentScore.toFixed(2)}`;
      const influenceTxt = `Influence: ${tweet.influenceScore.toFixed(1)}`;
      const tweetTxt = tweet.text;

      // How many lines does the tweet text take?
      const textMaxW = contentW - accentW - avatarSize - tweetCardPad * 2 - 2;
      const tweetLines = doc.splitTextToSize(tweetTxt, textMaxW);
      const tweetBlockH = tweetLines.length * LINE_H;
      const metaBlockH = LINE_H; // username + sentiment + scores on one line
      const padding = tweetCardPad * 2;
      const innerContentH = metaBlockH + tweetBlockH;
      const cardBodyH = avatarSize + tweetCardPad; // avatar is avatarSize tall, plus bottom pad
      const totalCardH = Math.max(cardBodyH, innerContentH + padding);

      // Page break check
      if (y + totalCardH + 4 > pageH - bottomMargin) {
        doc.addPage();
        y = margin;
      }

      // Accent bar
      doc.setFillColor(r, g, b);
      doc.rect(tweetCardX, y, accentW, totalCardH, "F");

      // Card background
      doc.setFillColor(C_CARD_BG[0], C_CARD_BG[1], C_CARD_BG[2]);
      doc.rect(tweetCardX + accentW, y, tweetCardInnerW - accentW, totalCardH, "F");

      const bodyX = tweetCardX + accentW;
      const innerX = bodyX + tweetCardPad;
      const textX = bodyX + avatarSize + tweetCardPad + 2;
      const textInnerW = tweetCardInnerW - accentW - avatarSize - tweetCardPad * 2 - 4;

      // Avatar circle (initial)
      const avatarCenterX = innerX + avatarSize / 2;
      const avatarCenterY = y + avatarSize / 2 + avatarY_offset / 2;
      doc.setFillColor(r, g, b);
      doc.circle(avatarCenterX, avatarCenterY, avatarSize / 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(
        (tweet.name.charAt(0) || "U").toUpperCase(),
        avatarCenterX,
        avatarCenterY + 1.5,
        { align: "center" }
      );

      // Row 1: username + sentiment badge + score info
      let lineY = y + tweetCardPad + LINE_H;
      write(usernameTxt, textX, lineY, { fontSize: 8.5, bold: true, color: [15, 23, 42] });

      const badgeX = textX + doc.getTextWidth(usernameTxt) + 3;
      const badgeW = doc.getTextWidth(sentimentTxt) + 6;
      doc.setFillColor(r, g, b);
      doc.roundedRect(badgeX, lineY - 3.2, badgeW, 3.8, 1, 1, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(sentimentTxt, badgeX + 3, lineY - 0.5);

      const scoreInfoX = badgeX + badgeW + 4;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C_GREY[0], C_GREY[1], C_GREY[2]);
      doc.text(`${scoreTxt} · ${influenceTxt}`, scoreInfoX, lineY - 0.5);

      // Row 2+: tweet text (may wrap)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      const wrappedLines = doc.splitTextToSize(tweetTxt, textInnerW);
      wrappedLines.forEach((line: string, i: number) => {
        doc.text(line, textX, lineY + LINE_H + i * LINE_H);
      });

      y += totalCardH + 4;
    });

    y += 4;
  }

  // ═══════════════════════════════════════════════════
  // ALL TWEETS TABLE
  // ═══════════════════════════════════════════════════
  if (y > pageH - 60) { doc.addPage(); y = margin; }

  write("All Analyzed Tweets", margin, y, { fontSize: 11, bold: true });
  y += 7;

  // Column widths: No | Username | Sentiment | Score | Influence | Likes | Retweets | Views
  const colWidths = [10, 36, 22, 22, 24, 20, 22, 20];
  const tableX = margin;

  // Table header row
  const headerRowH = 8;
  doc.setFillColor(C_HEADER_BG[0], C_HEADER_BG[1], C_HEADER_BG[2]);
  doc.rect(tableX, y, contentW, headerRowH, "F");

  const headers = ["#", "Username", "Sentiment", "Score", "Influence", "Likes", "Retweets", "Views"];
  let colX = tableX + 2;
  headers.forEach((h, i) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(h, colX, y + 5.5);
    colX += colWidths[i];
  });
  y += headerRowH;

  // Tweet rows
  const rowH = 7;
  result.tweets.forEach((tweet, idx) => {
    if (y + rowH > pageH - bottomMargin) {
      doc.addPage();
      y = margin;
    }

    const bg = idx % 2 === 0 ? 255 : C_ROW_ALT[0];
    const bg2 = idx % 2 === 0 ? 255 : C_ROW_ALT[1];
    const bg3 = idx % 2 === 0 ? 255 : C_ROW_ALT[2];
    doc.setFillColor(bg, bg2, bg3);
    doc.rect(tableX, y, contentW, rowH, "F");

    const [sr, sg, sb] = sentimentColor(tweet.sentiment);
    colX = tableX + 2;

    const rowData = [
      { text: String(idx + 1), color: C_GREY, bold: false },
      { text: `@${tweet.username}`, color: [15, 23, 42] as [number, number, number], bold: false },
      { text: tweet.sentiment.charAt(0).toUpperCase() + tweet.sentiment.slice(1), color: [sr, sg, sb] as [number, number, number], bold: true },
      { text: tweet.sentimentScore.toFixed(2), color: C_GREY, bold: false },
      { text: tweet.influenceScore.toFixed(1), color: C_GREY, bold: false },
      { text: tweet.likes >= 1000 ? `${(tweet.likes / 1000).toFixed(1)}k` : String(tweet.likes), color: C_GREY, bold: false },
      { text: tweet.retweets >= 1000 ? `${(tweet.retweets / 1000).toFixed(1)}k` : String(tweet.retweets), color: C_GREY, bold: false },
      { text: tweet.views >= 1000 ? `${(tweet.views / 1000).toFixed(1)}k` : String(tweet.views), color: C_GREY, bold: false },
    ];

    rowData.forEach((cell, i) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", cell.bold ? "bold" : "normal");
      doc.setTextColor(cell.color[0], cell.color[1], cell.color[2]);
      doc.text(cell.text, colX, y + 5);
      colX += colWidths[i];
    });

    y += rowH;
  });

  doc.setTextColor(0, 0, 0);

  // ═══════════════════════════════════════════════════
  // FOOTER (every page)
  // ═══════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C_GREY[0], C_GREY[1], C_GREY[2]);
    doc.text(
      `SentiTrack · Sentiment Analysis Report · Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  doc.setTextColor(0, 0, 0);
  doc.save(
    `sentiment_${result.query.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
