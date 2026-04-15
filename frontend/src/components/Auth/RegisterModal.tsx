"use client";

import { useState, useRef, useEffect } from "react";
import { apiRegister } from "@/stores/authStore";
import MaterialIcon from "@/components/MaterialIcon";

interface RegisterModalProps {
  onSwitchToLogin?: () => void;
}

export default function RegisterModal({ onSwitchToLogin }: RegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset form state when modal is shown (parent re-mounts it on showRegister change)
    setError(null);
    setSuccess(false);
    setShowPassword(false);
    setIsLoading(false);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    if (name.length < 2) {
      setError("Nama harus minimal 2 karakter.");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password harus minimal 8 karakter.");
      setIsLoading(false);
      return;
    }

    try {
      await apiRegister(name, email, password);
      setSuccess(true);
      // Auto-switch to login after short delay
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Always rendered by parent when needed — no internal isOpen check needed
  return (
    <div className="fixed inset-0 z-[101] bg-black/50 backdrop-blur-sm overflow-y-auto flex items-start justify-center sm:items-center">
      <div className="w-full max-w-md my-8">
        <div className="w-full max-w-md bg-white dark:bg-app-surface-low rounded-2xl shadow-2xl shadow-app-primary/20 border border-app-border-strong dark:border-app-border-strong overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-0">
            <div>
              <h2 className="text-2xl font-black text-app-main dark:text-app-main">
                Create Account
              </h2>
              <p className="text-sm text-app-muted dark:text-app-muted mt-1">
                Join SentiTrack and start analyzing
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="p-2 rounded-full hover:bg-app-surface-low dark:hover:bg-app-surface-low transition-colors text-app-muted dark:text-app-muted"
            >
              <MaterialIcon name="close" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="px-8 py-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                <MaterialIcon name="error_outline" className="text-base flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-600 dark:text-emerald-400">
                <MaterialIcon name="check_circle" className="text-base flex-shrink-0" />
                Akun berhasil dibuat! Mengalihkan ke login...
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-app-main dark:text-app-main mb-2">
                Nama
              </label>
              <input
                ref={nameRef}
                type="text"
                required
                placeholder="Nama lengkap"
                className="w-full px-4 py-3 bg-app-surface-low dark:bg-app-bg border border-app-border-strong dark:border-app-border-strong rounded-xl text-app-main dark:text-app-main placeholder:text-app-muted/60 dark:placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-primary/40"
              />
            </div>
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
                  placeholder="Minimal 8 karakter"
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
              disabled={isLoading || success}
              className="w-full py-3 bg-app-primary dark:bg-app-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-app-muted dark:text-app-muted">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-app-primary dark:text-app-primary font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
