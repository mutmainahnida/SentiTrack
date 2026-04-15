"use client";

import { create } from "zustand";

export type AuthTrigger = "topbar" | "search" | null;

const BACKEND_API = "http://localhost:5000";

interface TokenData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  userId?: string;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  authTrigger: AuthTrigger;
  pendingSearchQuery: string | null;
  pendingSearchExecuted: boolean;
  userEmail: string | null;
  userName: string | null;
  userId: string | null;
  isLogoutModalOpen: boolean;
  // Actions
  openLoginModal: (trigger: AuthTrigger) => void;
  closeLoginModal: () => void;
  login: (email: string) => void;
  logout: () => void;
  logoutAsync: () => Promise<void>;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  setPendingSearchQuery: (query: string | null) => void;
  markPendingSearchExecuted: () => void;
  resetAuth: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

function loadStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sentitrack_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuth(data: StoredAuth): void {
  localStorage.setItem("sentitrack_auth", JSON.stringify(data));
}

function clearAuth(): void {
  localStorage.removeItem("sentitrack_auth");
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from localStorage on client
  const stored = loadStoredAuth();
  const initialState = stored
    ? {
        isAuthenticated: true,
        userId: stored.userId,
        userName: stored.userName,
        userEmail: stored.userEmail,
      }
    : {
        isAuthenticated: false,
        userId: null,
        userName: null,
        userEmail: null,
      };

  return {
    isAuthenticated: initialState.isAuthenticated,
    isLoginModalOpen: false,
    authTrigger: null,
    pendingSearchQuery: null,
    pendingSearchExecuted: false,
    userEmail: initialState.userEmail,
    userName: initialState.userName,
    userId: initialState.userId,
    isLogoutModalOpen: false,

    openLoginModal: (trigger) =>
      set({ isLoginModalOpen: true, authTrigger: trigger }),

    closeLoginModal: () =>
      set({ isLoginModalOpen: false, authTrigger: null }),

    login: (email) => {
      // Called by modals after successful API login — stores data from API response
      set({
        isAuthenticated: true,
        isLoginModalOpen: false,
        userEmail: email,
        userName: email.split("@")[0],
      });
    },

    logout: () => {
      clearAuth();
      set({
        isAuthenticated: false,
        isLoginModalOpen: false,
        authTrigger: null,
        pendingSearchQuery: null,
        pendingSearchExecuted: false,
        userEmail: null,
        userName: null,
        userId: null,
        isLogoutModalOpen: false,
      });
    },

    logoutAsync: async () => {
      const accessToken = get().getAccessToken();
      const userId = get().userId;
      if (accessToken && userId) {
        try {
          await fetch(`${BACKEND_API}/api/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ userId }),
          });
        } catch {
          // Ignore network errors on logout
        }
      }
      get().logout();
    },

    openLogoutModal: () => set({ isLogoutModalOpen: true }),
    closeLogoutModal: () => set({ isLogoutModalOpen: false }),

    setPendingSearchQuery: (query) =>
      set({ pendingSearchQuery: query }),

    markPendingSearchExecuted: () =>
      set({ pendingSearchExecuted: true }),

    resetAuth: () => {
      clearAuth();
      set({
        isAuthenticated: false,
        isLoginModalOpen: false,
        authTrigger: null,
        pendingSearchQuery: null,
        pendingSearchExecuted: false,
        userEmail: null,
        userName: null,
        userId: null,
      });
    },

    getAccessToken: () => {
      const stored = loadStoredAuth();
      return stored?.accessToken ?? null;
    },

    getRefreshToken: () => {
      const stored = loadStoredAuth();
      return stored?.refreshToken ?? null;
    },
  };
});

// ─── Auth API helpers ────────────────────────────────────────────────────────

export async function apiLogin(
  email: string,
  password: string,
): Promise<TokenData> {
  const res = await fetch(`${BACKEND_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();

  if (!res.ok) {
    const msg =
      json?.message ??
      (res.status === 401 ? "Email atau password salah." : "Login gagal. Silakan coba lagi.");
    throw new Error(msg);
  }

  return json.data as TokenData;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.message ?? "Registrasi gagal. Silakan coba lagi.";
    throw new Error(msg);
  }
}

export async function apiRefresh(refreshToken: string): Promise<TokenData> {
  const res = await fetch(`${BACKEND_API}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error("Sesi telah berakhir. Silakan login kembali.");
  }

  return json.data as TokenData;
}

// Called by API utility on 401 responses — refreshes token and updates localStorage
export async function refreshTokens(): Promise<TokenData | null> {
  const stored = loadStoredAuth();
  if (!stored) return null;

  try {
    const newTokens = await apiRefresh(stored.refreshToken);
    const updated: StoredAuth = {
      ...stored,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
    saveAuth(updated);
    return newTokens;
  } catch {
    // Refresh failed — clear auth
    clearAuth();
    return null;
  }
}

// Centralized auth-aware fetch — use this for API calls that need the token
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let stored = loadStoredAuth();
  let accessToken = stored?.accessToken ?? null;

  // Try refresh if no token
  if (!accessToken) {
    const refreshed = await refreshTokens();
    accessToken = refreshed?.accessToken ?? null;
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && stored) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}
