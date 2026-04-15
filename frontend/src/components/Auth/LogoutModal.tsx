"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import MaterialIcon from "@/components/MaterialIcon";

export default function LogoutModal() {
  const router = useRouter();
  const { isLogoutModalOpen, closeLogoutModal, logout } = useAuthStore();

  if (!isLogoutModalOpen) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLogoutModal();
      }}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm bg-white dark:bg-app-surface-low rounded-2xl shadow-2xl shadow-app-primary/20 border border-app-border-strong dark:border-app-border-strong overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center px-8 pt-10 pb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <MaterialIcon name="logout" className="text-red-500 text-2xl" />
            </div>
            <h2 className="text-xl font-black text-app-main dark:text-app-main">Sign Out</h2>
            <p className="text-sm text-app-muted dark:text-app-muted mt-2">
              Are you sure you want to sign out of your account?
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex gap-3">
            <button
              onClick={closeLogoutModal}
              className="flex-1 py-3 bg-app-surface-low dark:bg-app-bg border border-app-border-strong dark:border-app-border-strong text-app-main dark:text-app-main font-bold rounded-xl hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}