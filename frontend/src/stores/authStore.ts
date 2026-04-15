"use client";

import { create } from "zustand";

export type AuthTrigger = "topbar" | "search" | null;

interface AuthState {
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  authTrigger: AuthTrigger;
  pendingSearchQuery: string | null;
  pendingSearchExecuted: boolean;
  userEmail: string | null;
  userName: string | null;
  isLogoutModalOpen: boolean;
  // Actions
  openLoginModal: (trigger: AuthTrigger) => void;
  closeLoginModal: () => void;
  login: (email: string) => void;
  logout: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  setPendingSearchQuery: (query: string | null) => void;
  markPendingSearchExecuted: () => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoginModalOpen: false,
  authTrigger: null,
  pendingSearchQuery: null,
  pendingSearchExecuted: false,
  userEmail: null,
  userName: null,
  isLogoutModalOpen: false,

  openLoginModal: (trigger) =>
    set({ isLoginModalOpen: true, authTrigger: trigger }),

  closeLoginModal: () =>
    set({ isLoginModalOpen: false, authTrigger: null }),

  login: (email) =>
    set({
      isAuthenticated: true,
      isLoginModalOpen: false,
      userEmail: email,
      userName: email.split("@")[0],
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      isLoginModalOpen: false,
      authTrigger: null,
      pendingSearchQuery: null,
      pendingSearchExecuted: false,
      userEmail: null,
      userName: null,
      isLogoutModalOpen: false,
    }),

  openLogoutModal: () => set({ isLogoutModalOpen: true }),
  closeLogoutModal: () => set({ isLogoutModalOpen: false }),

  setPendingSearchQuery: (query) =>
    set({ pendingSearchQuery: query }),

  markPendingSearchExecuted: () =>
    set({ pendingSearchExecuted: true }),

  resetAuth: () =>
    set({
      isAuthenticated: false,
      isLoginModalOpen: false,
      authTrigger: null,
      pendingSearchQuery: null,
      pendingSearchExecuted: false,
      userEmail: null,
      userName: null,
    }),
}));