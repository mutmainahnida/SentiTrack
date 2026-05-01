"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { IconByName } from "../ReactIcon";

const navItems = [
  { icon: "trending_up", label: "Dashboard", path: "/dashboard" },
  { icon: "search", label: "Search", path: "/search" },
  { icon: "history", label: "History", path: "/history" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-30 lg:hidden p-2 rounded-lg bg-app-surface-low dark:bg-app-surface border border-app-border shadow-sm"
      aria-label="Open sidebar"
    >
      <svg className="w-5 h-5 text-app-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, openLogoutModal } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [pathname, onClose]);

  return (
    <>
      {/* Mobile: Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-50 flex flex-col py-6 px-4 sm:px-6 border-r border-app-border-strong dark:border-app-border-strong bg-app-surface-low dark:bg-[#0F172A] transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:translate-x-0 lg:w-16 xl:w-64
        `}
      >
        {/* Logo */}
        <div className="mb-8 sm:mb-12 px-2">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tighter text-app-main dark:text-app-main whitespace-nowrap">
            SentiTrack
          </h1>
          <p className="text-[10px] sm:text-xs font-medium text-app-primary dark:text-app-primary opacity-70 hidden xl:block">
            Precision Analytics
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                router.push(item.path);
              }}
              className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors ${
                isActive
                  ? "text-app-primary font-bold border-r-2 border-app-primary bg-app-surface-low shadow-sm"
                  : "text-app-muted hover:text-app-primary hover:bg-app-primary/10 hover:translate-x-1"
              }`}
            >
              <IconByName name={item.icon} />
              <span className="text-sm">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      {mounted && isAuthenticated && (
        <div className="pt-8 border-t border-app-border-strong dark:border-app-border-strong mt-auto">
          <button
            onClick={openLogoutModal}
            className="flex items-center gap-3 py-3 px-4 w-full rounded-lg transition-all duration-200 text-app-muted border border-transparent hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 group"
          >
            <IconByName name="logout" className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">Logout</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
}