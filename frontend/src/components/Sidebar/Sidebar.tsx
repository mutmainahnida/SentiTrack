"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { icon: "trending_up", label: "Dashboard", path: "/dashboard" },
  { icon: "search", label: "Search", path: "/search" },
  { icon: "history", label: "History", path: "/history" },
];

/* ── Icon helpers (inline SVG) ────────────────────── */
function IconPulse({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconTrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconHistory({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  trending_up: IconTrendingUp,
  search: IconSearch,
  history: IconHistory,
  logout: IconLogout,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Comp = ICON_MAP[name];
  if (!Comp) return <IconSearch className={className} />;
  return <Comp className={className} />;
}

/* ── NavButton ────────────────────────────────────── */
function NavButton({ item, isActive, onClick }: {
  item: (typeof navItems)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left
        transition-all duration-200 cursor-pointer bg-transparent border-0
        ${isActive
          ? "text-[var(--primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-container)]"
        }
      `}
    >
      {isActive && (
        <>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
          <div className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-r from-[var(--primary)]/20 to-transparent" />
        </>
      )}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        isActive
          ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-[0_0_12px_var(--primary)]/20"
          : ""
      }`}>
        <NavIcon name={item.icon} className="w-5 h-5" />
      </div>
      <span className={`text-sm font-semibold whitespace-nowrap overflow-hidden ${
        isActive ? "text-[var(--text-main)] font-bold" : ""
      }`}>
        {item.label}
      </span>
    </button>
  );
}

/* ── Sidebar (fixed on desktop, logo trigger on mobile) ── */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openLogoutModal } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close mobile panel on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleNavigate = (path: string) => router.push(path);

  return (
    <>
      {/* ── Desktop: fixed persistent sidebar ─────────── */}
      <aside
        className={`
          hidden lg:flex flex-col
          fixed left-0 top-0 h-screen z-40
          w-56 bg-[var(--surface)]/90 backdrop-blur-xl
          border-r border-[var(--border)]
        `}
      >
        <div className="flex flex-col h-full w-full overflow-hidden px-4 py-6">

          {/* Logo */}
          <div className="mb-10 px-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--primary)]/25">
              <IconPulse className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base font-extrabold whitespace-nowrap tracking-tight text-[var(--text-main)]">SentiTrack</h1>
              <p className="text-[10px] font-medium text-[var(--primary)] whitespace-nowrap">Sentiment AI</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => (
              <NavButton
                key={item.path}
                item={item}
                isActive={pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              />
            ))}
          </nav>

          {/* Logout */}
          <div className="pt-6 border-t border-[var(--border)]">
            <button
              onClick={openLogoutModal}
              className="group flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left
                text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5
                transition-all duration-200 cursor-pointer bg-transparent border-0"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/10 transition-all">
                <NavIcon name="logout" className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold whitespace-nowrap">Keluar</span>
            </button>
          </div>

        </div>
      </aside>

      {/* ── Mobile: logo trigger → full drawer ─────────── */}
      <div className="lg:hidden">
        {/* Logo pill button — always visible top-left */}
        <button
          onClick={() => setMobileOpen(prev => !prev)}
          className="fixed top-4 left-4 z-50 flex items-center gap-2.5 px-3 py-2 rounded-xl
            bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border)]
            shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15
            transition-all duration-200 cursor-pointer"
          aria-label="Open sidebar"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center flex-shrink-0">
            <IconPulse className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-[var(--text-main)] tracking-tight">SentiTrack</span>
        </button>

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer panel */}
        <aside
          className={`
            fixed top-0 left-0 h-screen z-50 flex flex-col
            bg-[var(--surface)]/95 backdrop-blur-2xl
            border-r border-[var(--border)]
            shadow-2xl shadow-black/20
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${mobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"}
          `}
        >
          {/* Spacer to clear the logo pill */}
          <div className="h-16" />

          <div className="flex flex-col flex-1 overflow-hidden px-5 py-6">
            {/* Logo */}
            <div className="mb-8 px-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--primary)]/25">
                <IconPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-[var(--text-main)]">SentiTrack</h1>
                <p className="text-[10px] font-medium text-[var(--primary)]">Sentiment AI</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1.5">
              {navItems.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  isActive={pathname === item.path}
                  onClick={() => { handleNavigate(item.path); setMobileOpen(false); }}
                />
              ))}
            </nav>

            {/* Logout */}
            <div className="pt-6 border-t border-[var(--border)]">
              <button
                onClick={() => { openLogoutModal(); setMobileOpen(false); }}
                className="group flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left
                  text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5
                  transition-all duration-200 cursor-pointer bg-transparent border-0"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/10 transition-all">
                  <NavIcon name="logout" className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">Keluar</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}