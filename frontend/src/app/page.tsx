"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import MaterialIcon from "@/components/MaterialIcon";
import { FaXTwitter, FaLinkedinIn, FaGithub } from "react-icons/fa6";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, setPendingSearchQuery } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

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

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-bg text-app-main dark:text-app-main">

      {/* ── Sticky Top Nav ──────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-app-bg dark:bg-app-bg backdrop-blur-md border-b border-app-border-strong dark:border-app-border-strong">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo */}
          <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-tighter text-app-main dark:text-app-main">
            SentiTrack
          </span>

          {/* Nav links — desktop only */}
          <nav className="hidden lg:flex items-center gap-6 md:gap-8">
            <a
              href="#features"
              className="text-app-primary dark:text-app-primary border-b-2 border-app-primary dark:border-app-primary text-xs md:text-sm font-semibold"
            >
              Features
            </a>
            <a
              href="#about"
              className="text-app-muted dark:text-app-muted hover:text-app-main dark:hover:text-app-main text-xs md:text-sm font-semibold transition-colors"
            >
              About
            </a>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-app-muted dark:text-app-muted hover:text-app-main dark:hover:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors"
              aria-label="Toggle theme"
            >
              <MaterialIcon
                name={theme === "dark" ? "light_mode" : "dark_mode"}
                className="text-base sm:text-lg md:text-xl"
              />
            </button>

            {/* Mobile/Tablet: Hamburger menu — hidden on lg+ */}
            <div ref={mobileMenuRef} className="relative lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-app-muted dark:text-app-muted hover:text-app-main dark:hover:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors"
                aria-label="Open menu"
              >
                <MaterialIcon
                  name={mobileMenuOpen ? "close" : "menu"}
                  className="text-base sm:text-lg"
                />
              </button>

              {/* Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 sm:w-44 bg-white dark:bg-[#1a1a1a] border border-app-border-strong dark:border-app-border-strong rounded-xl shadow-xl overflow-hidden z-50">
                  <a
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-app-muted dark:text-app-muted hover:bg-app-surface-low dark:hover:bg-app-surface-low hover:text-app-main dark:hover:text-app-main transition-colors"
                  >
                    Login
                  </a>
                  <button
                    onClick={() => { handleGetStarted(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-bold bg-app-primary dark:bg-app-primary text-white hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Desktop: Login — visible lg+ */}
            <a
              href="/login"
              className="hidden lg:inline-flex px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-semibold text-app-muted dark:text-app-muted border border-app-border-strong dark:border-app-border-strong rounded-md sm:rounded-lg hover:text-app-main dark:hover:text-app-main transition-colors"
            >
              Login
            </a>

            {/* Desktop: Get Started — visible lg+ */}
            <button
              onClick={handleGetStarted}
              className="hidden lg:inline-flex px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-bold bg-app-primary dark:bg-app-primary text-white rounded-md sm:rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────── */}
      <section className="pt-16 sm:pt-24 pb-10 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        {/* AI badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-app-surface-low dark:bg-app-surface-low text-app-primary dark:text-app-primary text-[10px] sm:text-xs font-bold tracking-wider border border-app-primary/30 dark:border-app-primary/20 mb-6 sm:mb-8">
          <MaterialIcon name="trending_up" className="text-xs sm:text-sm" />
          NEW: AI MODEL V2.0 LIVE
        </div>

        {/* H1 */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-app-main dark:text-app-main mb-4 sm:mb-6 leading-tight">
          Analisis Sentimen Twitter<br />
          <span className="text-app-primary dark:text-app-primary">kurang dari 1 menit</span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-app-muted dark:text-app-muted max-w-2xl sm:max-w-3xl mx-auto mb-8 sm:mb-12 px-2">
          Platform analisis sentimen Twitter berbasis AI. Ambil keputusan berbasis data
          dengan akurasi tertinggi di industri hanya dalam hitungan detik.
        </p>

        {/* Search bar mockup */}
        <div className="max-w-2xl sm:max-w-3xl mx-auto mb-8 sm:mb-12 px-2 sm:px-0">
          <div className="p-1.5 sm:p-2 bg-app-surface-low dark:bg-app-surface-container border border-app-border-strong dark:border-app-border-strong rounded-lg sm:rounded-xl shadow-2xl shadow-app-primary/10 flex flex-col sm:flex-row items-stretch gap-1 sm:gap-2">
            <div className="flex items-center px-2 sm:px-3 flex-1 border-b sm:border-b-0 sm:border-r border-app-border-strong dark:border-app-border-strong gap-2">
              <MaterialIcon
                name="search"
                className="text-lg sm:text-xl text-app-muted dark:text-app-muted flex-shrink-0"
              />
              <input
                type="text"
                placeholder="Cari topik, brand, atau akun Twitter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                className="flex-1 py-2 sm:py-3 bg-transparent text-app-main dark:text-app-main text-sm sm:text-base focus:outline-none placeholder:text-app-muted dark:placeholder:text-app-muted"
              />
            </div>
            <button
              onClick={handleAnalyze}
              className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-app-primary dark:bg-app-primary text-white rounded-lg sm:rounded-lg font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Analyze Now
            </button>
          </div>
        </div>

        {/* Social proof stats */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-16">
          {[
            { value: "10k+", label: "Tweets" },
            { value: "500+", label: "Researchers" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl sm:text-2xl font-black text-app-main dark:text-app-main">{stat.value}</p>
              <p className="text-xs sm:text-sm text-app-muted dark:text-app-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value Propositions ──────────────────────────── */}
      <section className="bg-app-surface-low dark:bg-app-surface-low py-12 sm:py-16 md:py-24 border-y border-app-border-strong dark:border-app-border-strong/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: "dataset_linked",
                title: "Real-time Scraping",
                desc: "Kumpulkan data Twitter secara real-time dengan teknologi scraping canggih yang akurat dan terpercaya.",
              },
              {
                icon: "psychology",
                title: "AI-Powered Analysis",
                desc: "Model AI terbaru kami menganalisis sentimen dengan akurasi 96% menggunakan pemrosesan bahasa alami.",
              },
              {
                icon: "download",
                title: "Instant Export",
                desc: "Ekspor hasil analisis ke PDF, CSV, atau JSON dalam hitungan detik untuk laporan profesional.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group bg-app-bg dark:bg-app-bg p-5 sm:p-6 md:p-8 rounded-xl border border-app-border-strong dark:border-app-border-strong/30 hover:border-app-primary dark:hover:border-app-primary/50 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-app-primary/10 dark:bg-app-primary/10 text-app-primary dark:text-app-primary flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <MaterialIcon name={card.icon} className="text-xl sm:text-2xl" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-app-main dark:text-app-main mb-2 sm:mb-3">{card.title}</h3>
                <p className="text-sm sm:text-base text-app-muted dark:text-app-muted leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Showcase ────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-6">
          Visualisasi Data{" "}
          <span className="text-app-primary dark:text-app-primary">Kelas Dunia</span>
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-app-muted dark:text-app-muted max-w-xl md:max-w-2xl mx-auto mb-6 sm:mb-10">
          Dashboard interaktif dengan grafik real-time, heatmap geografis, dan word-cloud
          yang membuat analisis data menjadi lebih mudah dipahami.
        </p>

        {/* Checklist */}
        <div className="inline-flex flex-col items-start gap-3 sm:gap-4 text-left">
          {[
            "Sentiment Trend Charts",
            "Geographical Heatmaps",
            "Word-Cloud Topics",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 sm:gap-3">
              <MaterialIcon
                name="check_circle"
                filled={1}
                className="text-app-primary dark:text-app-primary text-lg sm:text-xl flex-shrink-0"
              />
              <span className="text-sm sm:text-base md:text-lg text-app-main dark:text-app-main font-medium">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── About Section ──────────────────────────────── */}
      <section id="about" className="bg-app-surface-low dark:bg-app-surface-low py-12 sm:py-16 md:py-24 border-t border-app-border-strong dark:border-app-border-strong/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6 sm:mb-10">
            Tentang SentiTrack
          </h2>
          <div className="text-sm sm:text-base md:text-lg text-app-muted dark:text-app-muted leading-relaxed space-y-4 sm:space-y-6 text-left">
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
              diandalkan, aman, dan mudah digunakan. Komitmen kami terhadap privasi data dan
              kepatuhan regulasi menjadikannya pilihan utama untuk penelitian akademis dan
              keperluan bisnis.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-app-bg dark:bg-app-bg border-t border-app-border-strong dark:border-app-border-strong/30 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
          {/* Logo + copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <span className="text-lg sm:text-xl font-black tracking-tighter text-app-main dark:text-app-main">
              SentiTrack
            </span>
            <span className="text-xs sm:text-sm text-app-muted dark:text-app-muted">
              &copy; 2026 SentiTrack
            </span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4 sm:gap-6">
            {[
              { label: "X", icon: FaXTwitter, href: "#" },
              { label: "LinkedIn", icon: FaLinkedinIn, href: "#" },
              { label: "GitHub", icon: FaGithub, href: "#" },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary text-xs sm:text-sm font-medium transition-colors"
                >
                  <Icon className="text-base" />
                  <span className="hidden xs:inline">{link.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
