"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import { FaSun, FaMoon } from "react-icons/fa";

/* ── Icons (inline SVG) ─────────────────────────── */
function IconPulse({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconShieldCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const titleMap: Record<string, string> = {
  "/": "Overview",
  "/dashboard": "Overview",
  "/search": "Search Results",
  "/history": "History",
  "/history/detail": "Analysis Detail",
};

/* ── Profile Dropdown ──────────────────────────── */
function ProfileDropdown({
  userName,
  userEmail,
  onLogout,
  onClose,
}: {
  userName: string | null;
  userEmail: string | null;
  onLogout: () => void;
  onClose: () => void;
}) {
  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : (userEmail?.[0] ?? "U").toUpperCase();

  return (
    <div
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden
        bg-[var(--surface)]/95 backdrop-blur-2xl
        border border-[var(--border-strong)]
        shadow-2xl shadow-black/20
        animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--surface-container)] to-transparent">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-black shadow-lg shadow-[var(--primary)]/20 flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-main)] truncate leading-tight">
              {userName ?? "User"}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{userEmail ?? "—"}</p>
          </div>
        </div>
      </div>


      {/* Actions */}
      <div className="py-2">
        <button
          onClick={() => { onClose(); }}
          className="w-full flex items-center gap-3 px-5 py-3 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-container)] transition-all cursor-pointer bg-transparent border-0"
        >
          <IconUser className="w-4.5 h-4.5 text-[var(--text-muted)]" />
          <span className="font-medium">Profile Settings</span>
        </button>
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="w-full flex items-center gap-3 px-5 py-3 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer bg-transparent border-0"
        >
          <IconLogout className="w-4.5 h-4.5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

/* ── TopBar ──────────────────────────────────── */
export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleMap[pathname] ?? "SentiTrack";
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, userName, userEmail, openLogoutModal } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : (userEmail?.[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex justify-between items-center w-full h-14 sm:h-16 px-4 sm:px-6 lg:px-8 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">

      {/* Left — page title */}
      <div className="flex items-center gap-3">
        <h2 className="font-black text-base sm:text-lg text-[var(--text-main)] tracking-tight">{title}</h2>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-container)] transition-all"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark"
            ? <FaSun className="w-4 h-4" />
            : <FaMoon className="w-4 h-4" />
          }
        </button>

        {mounted && isAuthenticated ? (
          /* Profile button + dropdown */
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className={`
                flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl
                border transition-all duration-200 cursor-pointer bg-transparent
                ${profileOpen
                  ? "bg-[var(--surface-container)] border-[var(--border-strong)] text-[var(--text-main)]"
                  : "border-transparent hover:bg-[var(--surface-container)] hover:border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }
              `}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-black shadow-sm shadow-[var(--primary)]/20">
                {initials}
              </div>
              {/* Name (hidden on small screens) + chevron */}
              <span className="hidden sm:block text-sm font-semibold max-w-[120px] truncate">
                {userName ?? userEmail?.split("@")[0] ?? "User"}
              </span>
              <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <ProfileDropdown
                userName={userName}
                userEmail={userEmail}
                onLogout={openLogoutModal}
                onClose={() => setProfileOpen(false)}
              />
            )}
          </div>
        ) : mounted ? (
          <a
            href="/login"
            className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm shadow-[var(--primary)]/20 hover:shadow-md hover:shadow-[var(--primary)]/30 transition-all"
          >
            Sign In
          </a>
        ) : null}
      </div>
    </header>
  );
}