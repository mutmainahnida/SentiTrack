"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/components/ThemeProvider";
import MaterialIcon from "../MaterialIcon";

const titleMap: Record<string, string> = {
  "/": "Overview",
  "/dashboard": "Overview",
  "/search": "Search Results",
  "/history": "Recent Searches",
};

export default function TopBar() {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "SentiTrack";
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, userName, userEmail, openLoginModal } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const displayName = userName ?? userEmail?.split("@")[0] ?? "User";

  return (
    <header className="sticky top-0 z-30 flex justify-between items-center w-full h-16 px-8 bg-white/80 dark:bg-app-bg backdrop-blur-md border-b border-app-border-strong dark:border-app-border-strong">
      <div>
        <h2 className="font-semibold text-lg text-app-main dark:text-app-main">{title}</h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors group"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <MaterialIcon
              name={theme === "dark" ? "light_mode" : "dark_mode"}
              className="text-app-muted dark:text-app-muted group-hover:text-app-primary dark:group-hover:text-app-primary"
            />
          </button>
          <button className="p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors group">
            <MaterialIcon name="notifications" className="text-app-muted dark:text-app-muted group-hover:text-app-primary dark:group-hover:text-app-primary" />
          </button>
        </div>
        <div className="h-8 w-[1px] bg-app-border-strong dark:bg-app-border-strong" />
        {mounted && isAuthenticated ? (
          <div className="flex items-center gap-3 pl-2">
            <span className="text-sm font-bold text-app-main dark:text-app-main">{displayName}</span>
            <div className="w-8 h-8 rounded-lg bg-app-primary dark:bg-app-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        ) : mounted ? (
          <button
            onClick={() => openLoginModal("topbar")}
            className="px-4 py-2 bg-app-primary text-white rounded-lg font-bold text-sm hover:opacity-90"
          >
            Sign In
          </button>
        ) : null}
      </div>
    </header>
  );
}
