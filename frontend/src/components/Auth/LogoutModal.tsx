"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { FaSignOutAlt } from "react-icons/fa";

export default function LogoutModal() {
  const router = useRouter();
  const { isLogoutModalOpen, closeLogoutModal, logoutAsync } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  if (!isLogoutModalOpen) return null;

  const handleLogout = async () => {
    setIsLoading(true);
    await logoutAsync();
    router.push("/");
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLogoutModal();
      }}
    >
      <div className="bg-white dark:bg-app-surface-low rounded-2xl shadow-2xl shadow-app-primary/20 border border-app-border-strong dark:border-app-border-strong overflow-hidden w-full max-w-sm max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-center px-8 pt-10 pb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <FaSignOutAlt className="text-red-500 text-2xl" />
            </div>
            <h2 className="text-xl font-black text-app-main dark:text-app-main">
              Logout
            </h2>
            <p className="text-sm text-app-muted dark:text-app-muted mt-2">
              Are you sure you want to logout out of your account?
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex gap-3">
            <button
              onClick={closeLogoutModal}
              disabled={isLoading}
              className="flex-1 py-3 bg-app-surface-low dark:bg-app-bg border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main font-bold rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </>
              ) : (
                "Logout"
              )}
            </button>
          </div>
      </div>
    </div>
  );
}
