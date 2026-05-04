"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* ─── Icon helpers ───────────────────────────────────── */
function IconPulse({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconBrain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M12 18v4" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBarChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconActivity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.907z" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconQuote({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

/* ─── Motion variants ─────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Stats ──────────────────────────────────────────── */
const stats = [
  { value: "2.4M+", label: "Tweets Analyzed", icon: <IconActivity className="w-5 h-5" /> },
  { value: "98.7%", label: "Accuracy Rate", icon: <IconShield className="w-5 h-5" /> },
  { value: "12K+", label: "Active Researchers", icon: <IconUsers className="w-5 h-5" /> },
  { value: "<45s", label: "Avg. Analysis Time", icon: <IconZap className="w-5 h-5" /> },
];

/* ─── Feature cards ───────────────────────────────────── */
const features = [
  {
    icon: <IconBrain className="w-6 h-6" />,
    accent: "#22D3EE",
    label: "Neural Engine",
    title: "AI-Powered Sentiment Detection",
    desc: "Transformer-based model trained on 10M+ tweets. Detects context, sarcasm, irony, and nuanced emotional shifts with 98.7% accuracy.",
    tags: ["NLP", "Deep Learning", "Real-time"],
  },
  {
    icon: <IconTrend className="w-6 h-6" />,
    accent: "#818CF8",
    label: "Live Tracking",
    title: "Real-time Social Intelligence",
    desc: "Monitor brand perception, campaign performance, and market trends the moment they happen. Streaming data with sub-second latency.",
    tags: ["Streaming", "Trending", "Alerts"],
  },
  {
    icon: <IconBarChart className="w-6 h-6" />,
    accent: "#34D399",
    label: "Visual Analytics",
    title: "Beautiful Data Stories",
    desc: "Interactive dashboards with sentiment heatmaps, word clouds, geographic maps, and timeline trends. Export to PDF, CSV, or JSON.",
    tags: ["Charts", "Export", "Sharing"],
  },
];

/* ─── Testimonials ────────────────────────────────────── */
const testimonials = [
  {
    quote: "SentiTrack changed how we track brand perception. What used to take days now happens in under a minute — with better accuracy than our manual process.",
    author: "Sarah Chen",
    role: "Head of Research, Meridian Analytics",
    avatar: "SC",
    accent: "#22D3EE",
  },
  {
    quote: "The sarcasm detection alone is worth it. We caught a viral negative wave 6 hours before it peaked. That lead time saved our campaign.",
    author: "Marcus Webb",
    role: "CMO, NovaBrand Group",
    avatar: "MW",
    accent: "#818CF8",
  },
  {
    quote: "As an academic researcher, I need reliable data. SentiTrack's API is clean, fast, and the sentiment model actually understands Indonesian context.",
    author: "Dr. Ayu Prasetyo",
    role: "Senior Researcher, LIPI Indonesia",
    avatar: "AP",
    accent: "#34D399",
  },
];

/* ─── Page Component ─────────────────────────────────── */
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, setPendingSearchQuery } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ─── Smooth scroll to section ─────────────────────── */
  const scrollToSection = useCallback((href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleAnalyze = () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) { setPendingSearchQuery(searchQuery.trim()); router.push("/login"); }
    else { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); }
  };

  const handleGetStarted = () => { setPendingSearchQuery(null); router.push("/register"); };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)] overflow-x-hidden font-body">

      {/* ══ Neural Background Layer ══════════════════════ */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {/* Dot grid */}
        <div className="absolute inset-0 neural-grid opacity-40" />
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--primary)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[var(--secondary)]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[var(--accent-cyan)]/3 rounded-full blur-[150px]" />
      </div>

      {/* ══ Sticky Nav ═════════════════════════════════════ */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
              <IconPulse className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight font-display text-[var(--text-main)]">
              SentiTrack
            </span>
          </motion.button>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", href: "#features" },
              { label: "Testimonials", href: "#testimonials" },
              { label: "About", href: "#about" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative group cursor-pointer bg-transparent border-0 p-0"
              >
                {item.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[var(--primary)] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/login")}
              className="border-[var(--border-strong)] text-[var(--text-main)] hover:bg-[var(--surface-container)]">
              Log In
            </Button>
            <Button size="sm" onClick={handleGetStarted}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all">
              Get Started <IconArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ══ Hero Section ══════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10 w-full">

          {/* AI Badge */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex justify-center mb-6">
            <motion.div variants={fadeUp}>
              <Badge className="gap-2 px-4 py-1.5 bg-[var(--surface)] border border-[var(--border-strong)] shadow-lg shadow-[var(--primary)]/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
                </span>
                <span className="text-xs font-semibold text-[var(--text-main)]">
                  Neural Model V2.1 — Now 40% faster
                </span>
              </Badge>
            </motion.div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center max-w-4xl mx-auto">
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black tracking-tight font-display leading-[1.05] mb-5">
              <span className="text-[var(--text-main)]">Decode the </span>
              <span className="text-[var(--text-main)]">Pulse of </span>
              <br className="hidden md:block" />
              <span className="gradient-text">Public Opinion</span>
              <br className="hidden md:block" />
              <span className="text-[var(--text-main)]">in Minutes</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base md:text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
              SentiTrack uses cutting-edge AI to analyze millions of tweets in real-time.
              Understand sentiment, track trends, and uncover insights — all from one powerful platform.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-8">
              <div className="group relative rounded-2xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-2xl shadow-[var(--primary)]/10 overflow-hidden transition-all duration-300 focus-within:shadow-[var(--primary)]/20 focus-within:border-[var(--primary)]/30">
                <div className="flex flex-col sm:flex-row items-stretch">
                  <div className="flex items-center px-4 py-3 flex-1 border-b sm:border-b-0 sm:border-r border-[var(--border)] gap-3">
                    <IconTwitter className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
                    <Input
                      type="text"
                      placeholder="Enter any topic, brand, keyword, or @username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)] p-0 h-auto"
                    />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    size="lg"
                    className="m-1 px-6 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-semibold shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all duration-300"
                  >
                    Analyze
                    <IconArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                {/* Scan line effect */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30" />
              </div>
              <p className="text-xs text-center mt-2 text-[var(--text-muted)]">
                Try: "Tesla Model Y", "@NASA", "World Cup 2026", " presidential election"
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                >
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 text-[var(--primary)] group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <motion.p
                    className="text-xl md:text-2xl font-black font-display text-[var(--text-main)]"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating orbs decoration */}
          <div className="absolute top-40 right-10 pointer-events-none hidden lg:block">
            <motion.div
              className="w-2 h-2 rounded-full bg-[var(--primary)]"
              animate={{ y: [-15, 15, -15], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="absolute top-60 left-16 pointer-events-none hidden lg:block">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)]"
              animate={{ y: [15, -15, 15], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>
        </div>
      </section>

      {/* ══ Features + How It Works (Merged) ══════════════ */}
      <section id="features" className="section-py bg-[var(--surface-container-low)] dark:bg-[var(--surface-container)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)]/3 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">

          {/* Section header */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-[var(--text-main)] mb-8">
              Platform <span className="gradient-text">capabilities</span>
            </h2>
          </motion.div>

          {/* Feature cards */}
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5 section-mb" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUp}>
                <Card className="card-feature group h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-500 group-hover:h-full"
                    style={{ background: `linear-gradient(to bottom, ${feature.accent}, transparent)`, opacity: 0.3 }} />
                  <CardContent className="p-6 relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${feature.accent}15`, color: feature.accent }}>
                      {feature.icon}
                    </div>
                    <Badge className="mb-2 text-xs font-semibold"
                      style={{ background: `${feature.accent}10`, color: feature.accent, border: `1px solid ${feature.accent}20` }}>
                      {feature.label}
                    </Badge>
                    <h3 className="text-lg font-bold font-display text-[var(--text-main)] mb-2">{feature.title}</h3>
                    <p className="text-[var(--text-muted)] leading-relaxed mb-4 text-sm">{feature.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {feature.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-container)] text-[var(--text-muted)] border border-[var(--border)]">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* How It Works */}
          <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-sm font-medium text-[var(--text-main)] tracking-wide uppercase">How it works — 3 simple steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { step: "01", icon: <IconPulse className="w-5 h-5" />, accent: "#22D3EE", title: "Input Your Query", desc: "Enter any keyword, hashtag, @username, or URL. Set your date range." },
              { step: "02", icon: <IconBrain className="w-5 h-5" />, accent: "#818CF8", title: "Neural Analysis", desc: "Our AI engine processes thousands of tweets with 98.7% accuracy." },
              { step: "03", icon: <IconBarChart className="w-5 h-5" />, accent: "#34D399", title: "Visualize & Act", desc: "Get interactive charts and actionable insights in under 60 seconds." },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                {i < 2 && <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[var(--border)] to-transparent z-10" style={{ width: "calc(100% - 2rem)" }} />}
                <Card className="card-glass relative z-20">
                  <CardContent className="p-5">
                    <div className="text-4xl font-black font-display text-[var(--border-strong)] mb-2 leading-none select-none">{item.step}</div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${item.accent}15`, color: item.accent }}>{item.icon}</div>
                    <h3 className="text-base font-bold font-display text-[var(--text-main)] mb-1">{item.title}</h3>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Testimonials + CTA (Merged) ════════════════════ */}
      <section id="testimonials" className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[var(--primary)]/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[var(--secondary)]/3 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">

          {/* Section header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-3 px-3 py-1 bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20 text-[var(--accent-mint)] font-semibold text-xs">
              TRUSTED BY RESEARCHERS
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-[var(--text-main)]">
              Loved by <span className="gradient-text">12,000+</span> teams
            </h2>
          </motion.div>

          {/* Testimonial cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {testimonials.map((t, i) => (
              <motion.div key={t.author} variants={fadeUp}>
                <Card className="h-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <IconQuote className="w-6 h-6 mb-3 opacity-20" style={{ color: t.accent }} />
                    <p className="text-[var(--text-main)] leading-relaxed mb-5 italic text-sm">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}88)` }}>
                        {t.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-main)] text-sm">{t.author}</p>
                        <p className="text-xs text-[var(--text-muted)]">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA — inline compact banner */}
          <motion.div
            className="relative rounded-2xl overflow-hidden p-6 md:p-8 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--secondary)]/5 to-[var(--accent-cyan)]/10" />
            <div className="absolute inset-0 bg-[var(--surface-container)]/80" />
            <div className="absolute inset-0 border border-[var(--border-strong)] rounded-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-[var(--primary)]/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-black font-display tracking-tight text-[var(--text-main)] mb-2">
                Ready to decode your audience?
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-5">
                Join thousands of researchers, marketers, and analysts who trust SentiTrack
                to power their decisions with real-time social intelligence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="sm" onClick={handleGetStarted}
                  className="px-6 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-bold shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all">
                  Start Free Analysis
                  <IconArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/login")}
                  className="px-6 py-2 border-[var(--border-strong)] text-[var(--text-main)] hover:bg-[var(--surface-container)] transition-all font-semibold">
                  View Live Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ About Section ══════════════════════════════════ */}
      <section id="about" className="section-mt section-mb bg-[var(--surface-container-low)] dark:bg-[var(--surface-container)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] font-semibold text-xs">
              ABOUT THE PROJECT
            </Badge>
            <h2 className="text-4xl font-black font-display tracking-tight text-[var(--text-main)]">
              Built for the next generation of research
            </h2>
          </motion.div>
          <motion.div
            className="text-[var(--text-muted)] leading-relaxed space-y-5 text-base md:text-lg"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <p>
              SentiTrack is an open research platform developed to democratize AI-powered
              sentiment analysis. Built with Next.js, Tailwind CSS, and a Python backend
              powered by transformer models, it delivers enterprise-grade analysis to anyone
              with an internet connection.
            </p>
            <p>
              Our neural engine is continuously trained on multilingual data — including
              Indonesian, English, and regional dialects — to ensure accurate detection
              even in culturally nuanced contexts. Whether you're tracking brand reputation,
              monitoring elections, or analyzing customer feedback, SentiTrack adapts to
              your research needs.
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              {["Next.js 16", "Tailwind v4", "Framer Motion", "Python AI", "FastAPI", "PostgreSQL"].map((tag) => (
                <span key={tag} className="text-sm px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text-muted)] font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Footer ════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border-strong)] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <IconPulse className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-extrabold font-display tracking-tight text-[var(--text-main)]">SentiTrack</span>
            <span className="text-xs text-[var(--text-muted)]">&copy; 2026</span>
          </div>
          <div className="flex items-center gap-6">
            {["Twitter", "GitHub", "Discord"].map((link) => (
              <a key={link} href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors font-medium">
                {link}
              </a>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Precision. Speed. Insight.</p>
        </div>
      </footer>
    </div>
  );
}