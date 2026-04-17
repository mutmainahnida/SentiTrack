"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, apiLogin } from "@/stores/authStore";
import MaterialIcon from "@/components/MaterialIcon";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const {
    pendingSearchQuery,
    setPendingSearchQuery,
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setError(null);
    setShowPassword(false);
    setTimeout(() => emailRef.current?.focus(), 50);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";

    try {
      const tokens = await apiLogin(email, password);
      login(email, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, userId: tokens.userId ?? undefined });

      const q = pendingSearchQuery;
      setPendingSearchQuery(null);

      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-bg flex items-center justify-center p-4">
      <div className="bg-white dark:bg-app-surface-low rounded-2xl shadow-2xl shadow-app-primary/20 border border-app-border-strong dark:border-app-border-strong overflow-hidden w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-0">
          <div>
            <h2 className="text-2xl font-black text-app-main dark:text-app-main">
              Welcome Back
            </h2>
            <p className="text-sm text-app-muted dark:text-app-muted mt-1">
              Sign in to your SentiTrack account
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              <MaterialIcon name="error_outline" className="text-base flex-shrink-0" />
              {error}
            </div>
          )}

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
                ref={passwordRef}
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
            <a
              href="/register"
              className="text-app-primary dark:text-app-primary font-semibold hover:underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
