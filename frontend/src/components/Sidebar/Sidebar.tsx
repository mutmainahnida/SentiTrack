"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { IconByName } from "../ReactIcon";

const navItems = [
  { icon: "trending_up", label: "Dashboard", path: "/dashboard" },
  { icon: "search", label: "Search", path: "/search" },
  { icon: "history", label: "History", path: "/history" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, openLogoutModal } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-app-border-strong dark:border-app-border-strong bg-app-surface-low dark:bg-app-bg flex flex-col py-8 px-6 z-50">
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-2xl font-black tracking-tighter text-app-main dark:text-app-main">SentiTrack</h1>
        <p className="text-xs font-medium text-app-primary dark:text-app-primary opacity-70">Precision Analytics</p>
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
  );
}