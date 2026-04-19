"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import { FaSun, FaMoon, FaSearch, FaCheckCircle, FaChartBar, FaArrowRight, FaBolt, FaDatabase, FaBrain, FaFileExport, FaQuoteLeft } from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";
import { IconByName } from "@/components/ReactIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants } from "framer-motion";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, setPendingSearchQuery } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAnalyze = () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) {
      setPendingSearchQuery(searchQuery.trim());
      router.push("/login");
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleGetStarted = () => {
    setPendingSearchQuery(null);
    router.push("/register");
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  const features = [
    {
      icon: <FaDatabase className="text-2xl" />,
      title: "Real-time Scraping",
      desc: "Kumpulkan data Twitter secara real-time dengan teknologi scraping canggih yang akurat dan terpercaya.",
    },
    {
      icon: <FaBrain className="text-2xl" />,
      title: "AI-Powered Analysis",
      desc: "Model AI terbaru kami menganalisis sentimen dengan akurasi 96% menggunakan pemrosesan bahasa alami.",
    },
    {
      icon: <FaFileExport className="text-2xl" />,
      title: "Instant Export",
      desc: "Ekspor hasil analisis ke PDF, CSV, atau JSON dalam hitungan detik untuk laporan profesional.",
    },
  ];

  const stats = [
    { value: "10k+", label: "Tweets" },
    { value: "500+", label: "Researchers" },
    { value: "99.9%", label: "Uptime" },
  ];

  const testimonials = [
    {
      quote: "SentiTrack membantu kami memahami sentimen publik terhadap brand dalam hitungan menit, bukan jam.",
      author: "Dr. Sarah Chen",
      role: "Research Director, MarketMind"
    },
    {
      quote: "Akurasi AI-nya luar biasa. Kami menggunakan ini untuk tracking campaign marketing kami setiap minggu.",
      author: "Michael Torres",
      role: "Head of Digital, BrandFirst"
    }
  ];

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-bg text-app-main dark:text-app-main overflow-x-hidden">
      {/* ── Sticky Top Nav ──────────────────────────────── */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-app-bg/80 dark:bg-app-bg/80 backdrop-blur-xl border-b border-app-border-strong"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.span
            className="text-2xl font-black tracking-tighter text-app-main dark:text-app-main"
            whileHover={{ scale: 1.02 }}
          >
            SentiTrack
          </motion.span>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            <motion.a
              href="#features"
              whileHover={{ y: -2 }}
              className="relative text-app-primary dark:text-app-primary text-sm font-semibold group"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-app-primary transition-all group-hover:w-full" />
            </motion.a>
            <motion.a
              href="#about"
              whileHover={{ y: -2 }}
              className="text-app-muted dark:text-app-muted hover:text-app-main dark:hover:text-app-main text-sm font-semibold transition-colors"
            >
              About
            </motion.a>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <FaSun className="h-4 w-4" /> : <FaMoon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
              Login
            </Button>
            <Button size="sm" onClick={handleGetStarted}>
              Get Started <FaArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ── Hero Section ───────────────────────────────── */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-app-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          {/* Floating orbs */}
          <motion.div
            className="absolute top-32 right-20 w-4 h-4 bg-app-primary/40 rounded-full"
            animate={{ y: [-10, 10, -10], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-48 left-32 w-3 h-3 bg-blue-400/40 rounded-full"
            animate={{ y: [10, -10, 10], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* AI badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2">
              <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-xs font-bold tracking-wider bg-gradient-to-r from-app-primary/10 to-blue-400/10 border-app-primary/20">
                <FaBolt className="h-3 w-3 text-yellow-500" />
                <span className="bg-gradient-to-r from-app-primary to-blue-500 bg-clip-text text-transparent">
                  NEW: AI MODEL V2.0 LIVE
                </span>
              </Badge>
            </motion.div>

            {/* H1 */}
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black tracking-tight mt-8 mb-6 leading-tight">
              <span className="text-app-main dark:text-app-main">Analisis Sentimen Twitter</span>
              <br />
              <motion.span
                className="bg-gradient-to-r from-app-primary via-blue-500 to-purple-500 bg-clip-text text-transparent"
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              >
                kurang dari 1 menit
              </motion.span>
            </motion.h1>

            {/* Description */}
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-app-muted dark:text-app-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              Platform analisis sentimen Twitter berbasis AI. Ambil keputusan berbasis data
              dengan akurasi tertinggi di industri hanya dalam hitungan detik.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={itemVariants} className="max-w-2xl mx-auto mb-12">
              <Card className="p-1.5 bg-white/50 dark:bg-app-surface/50 backdrop-blur-sm border-app-border-strong shadow-2xl shadow-app-primary/10">
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex items-center px-4 flex-1 border-b sm:border-b-0 sm:border-r border-app-border bg-transparent gap-3">
                    <FaSearch className="text-app-muted flex-shrink-0" />
                    <Input
                      type="text"
                      placeholder="Cari topik, brand, atau akun Twitter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base"
                    />
                  </div>
                  <Button onClick={handleAnalyze} size="lg" className="gap-2">
                    Analyze Now <FaArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Social proof stats */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-12">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <motion.p
                    className="text-3xl font-black text-app-main dark:text-app-main"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-sm text-app-muted dark:text-app-muted">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Value Propositions ──────────────────────────── */}
      <section id="features" className="py-24 bg-gradient-to-b from-app-surface-low/50 to-transparent dark:from-app-surface/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, i) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="group h-full bg-white/80 dark:bg-app-surface/80 backdrop-blur-sm border-app-border hover:border-app-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-app-primary/5 hover:-translate-y-1">
                  <CardContent className="p-8">
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-app-primary/20 to-blue-400/20 flex items-center justify-center mb-6 text-app-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-xl font-bold text-app-main dark:text-app-main mb-3">{feature.title}</h3>
                    <p className="text-app-muted dark:text-app-muted leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Feature Showcase ────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-black tracking-tight mb-6">
              Visualisasi Data{" "}
              <span className="bg-gradient-to-r from-app-primary to-blue-500 bg-clip-text text-transparent">Kelas Dunia</span>
            </h2>
            <p className="text-lg text-app-muted dark:text-app-muted max-w-2xl mx-auto mb-12">
              Dashboard interaktif dengan grafik real-time, heatmap geografis, dan word-cloud
              yang membuat analisis data menjadi lebih mudah dipahami.
            </p>
          </motion.div>

          {/* Checklist */}
          <motion.div
            className="inline-flex flex-col items-start gap-4 text-left"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {[
              "Sentiment Trend Charts",
              "Geographical Heatmaps",
              "Word-Cloud Topics",
            ].map((item, i) => (
              <motion.div
                key={item}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                  className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <FaCheckCircle className="text-emerald-500 h-4 w-4" />
                </motion.div>
                <span className="text-app-main dark:text-app-main font-medium">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-transparent via-app-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black tracking-tight">
              Dipercaya oleh Peneliti & Brand
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card className="bg-white/80 dark:bg-app-surface/80 backdrop-blur-sm border-app-border h-full">
                  <CardContent className="p-8">
                    <FaQuoteLeft className="text-app-primary/30 h-8 w-8 mb-4" />
                    <p className="text-lg text-app-main dark:text-app-main mb-6 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                    <div>
                      <p className="font-bold text-app-main dark:text-app-main">{t.author}</p>
                      <p className="text-sm text-app-muted dark:text-app-muted">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── About Section ──────────────────────────────── */}
      <section id="about" className="py-24 bg-app-surface-low dark:bg-app-surface/50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-black tracking-tight mb-10">
              Tentang SentiTrack
            </h2>
          </motion.div>
          <motion.div
            className="text-lg text-app-muted dark:text-app-muted leading-relaxed space-y-6 text-left"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <p>
              SentiTrack adalah platform analisis sentimen Twitter yang dikembangkan
              untuk membantu peneliti, marketer, dan analis data memahami opini publik
              dengan cara yang lebih efisien dan akurat. Kami menggabungkan teknologi
              AI terbaru dengan antarmuka yang intuitif untuk memberikan hasil analisis
              dalam hitungan detik.
            </p>
            <p>
              Dengan model AI V2.0 yang baru saja diluncurkan, platform kami kini mampu
              mendeteksi nuansa emosional yang lebih halus dan memberikan wawasan yang lebih
              mendalam tentang tren percakapan di Twitter. Teknologi pemrosesan bahasa alami
              kami terus diperbarui untuk mengikuti perkembangan bahasa slang dan konteks
              budaya yang berubah dengan cepat.
            </p>
            <p>
              Telah dipercaya oleh lebih dari 500 peneliti dan organisasi di seluruh dunia,
              SentiTrack berkomitmen untuk menyediakan alat analisis sentimen yang dapat
              diandalkan, aman, dan mudah digunakan.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-app-border-strong py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <span className="text-xl font-black tracking-tighter text-app-main dark:text-app-main">
              SentiTrack
            </span>
            <span className="text-sm text-app-muted dark:text-app-muted">
              &copy; 2026 SentiTrack
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-app-muted dark:text-app-muted hover:text-app-primary text-sm font-medium transition-colors">
              Twitter
            </a>
            <a href="#" className="text-app-muted dark:text-app-muted hover:text-app-primary text-sm font-medium transition-colors">
              LinkedIn
            </a>
            <a href="#" className="text-app-muted dark:text-app-muted hover:text-app-primary text-sm font-medium transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
