"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import MaterialIcon from "../MaterialIcon";
import { SidebarToggle } from "@/components/Sidebar";

interface TopBarProps {
  onSidebarToggle?: () => void;
}

const titleMap: Record<string, string> = {
  "/": "Overview",
  "/dashboard": "Overview",
  "/search": "Search Results",
  "/history": "Recent Searches",
};

export default function TopBar({ onSidebarToggle }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleMap[pathname] ?? "SentiTrack";
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, userName, userEmail } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const displayName = userName ?? userEmail?.split("@")[0] ?? "User";

  return (
    <header className="sticky top-0 z-20 sm:z-30 flex justify-between items-center w-full h-14 sm:h-16 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-app-bg backdrop-blur-md border-b border-app-border-strong dark:border-app-border-strong">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile: sidebar toggle replaces spacer */}
        <button
          onClick={onSidebarToggle}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-app-muted hover:text-app-main hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors lg:hidden"
          aria-label="Open sidebar"
        >
          <MaterialIcon name="menu" className="text-lg sm:text-xl" />
        </button>

        <h2 className="font-semibold text-sm sm:text-base lg:text-lg text-app-main dark:text-app-main">{title}</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors group"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <MaterialIcon
              name={theme === "dark" ? "light_mode" : "dark_mode"}
              className="text-base sm:text-lg text-app-muted dark:text-app-muted group-hover:text-app-primary dark:group-hover:text-app-primary"
            />
          </button>
          <button className="p-1.5 sm:p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors group hidden sm:block">
            <MaterialIcon name="notifications" className="text-base sm:text-lg text-app-muted dark:text-app-muted group-hover:text-app-primary dark:group-hover:text-app-primary" />
          </button>
        </div>
        <div className="hidden sm:block h-6 sm:h-8 w-[1px] bg-app-border-strong dark:bg-app-border-strong" />
        {mounted && isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3 pl-2">
            <span className="text-xs sm:text-sm font-bold text-app-main dark:text-app-main hidden sm:inline">{displayName}</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-app-primary dark:bg-app-primary flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        ) : mounted ? (
          <a
            href="/login"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-app-primary text-white rounded-lg font-bold text-xs sm:text-sm hover:opacity-90"
          >
            Sign In
          </a>
        ) : null}
      </div>
    </header>
  );
}
