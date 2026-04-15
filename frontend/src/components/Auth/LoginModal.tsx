"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import MaterialIcon from "@/components/MaterialIcon";

export default function LoginModal() {
  const router = useRouter();
  const { isLoginModalOpen, closeLoginModal, login, pendingSearchQuery, setPendingSearchQuery } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  if (!isLoginModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const email = emailRef.current?.value ?? "";

    await new Promise((r) => setTimeout(r, 800));

    login(email);

    if (pendingSearchQuery) {
      const q = pendingSearchQuery;
      setPendingSearchQuery(null);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md bg-white dark:bg-app-surface-low rounded-2xl shadow-2xl shadow-app-primary/20 border border-app-border-strong dark:border-app-border-strong overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-0">
            <div>
              <h2 className="text-2xl font-black text-app-main dark:text-app-main">Welcome Back</h2>
              <p className="text-sm text-app-muted dark:text-app-muted mt-1">Sign in to your SentiTrack account</p>
            </div>
            <button
              onClick={closeLoginModal}
              className="p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors text-app-muted dark:text-app-muted"
            >
              <MaterialIcon name="close" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-app-main dark:text-app-main mb-2">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-app-surface-low dark:bg-app-bg border border-app-border-strong dark:border-app-border-strong rounded-xl text-app-main dark:text-app-main placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-app-main dark:text-app-main mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 bg-app-surface-low dark:bg-app-bg border border-app-border-strong dark:border-app-border-strong rounded-xl text-app-main dark:text-app-main placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-app-muted dark:text-app-muted hover:text-app-primary dark:hover:text-app-primary transition-colors"
                >
                  <MaterialIcon name={showPassword ? "visibility" : "visibility_off"} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-app-primary dark:bg-app-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-app-muted dark:text-app-muted">
              Don&apos;t have an account?{" "}
              <a href="#" className="text-app-primary dark:text-app-primary font-semibold hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}