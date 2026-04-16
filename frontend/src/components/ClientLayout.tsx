"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ThemeProvider } from "./ThemeProvider";
import { LoginModal, LogoutModal, RegisterModal } from "./Auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showRegister, setShowRegister] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const modalContent = mounted ? (
    <>
      {showRegister ? (
        <RegisterModal onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginModal onSwitchToRegister={() => setShowRegister(true)} />
      )}
      <LogoutModal />
    </>
  ) : null;

  return (
    <ThemeProvider>
      {children}
      {typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </ThemeProvider>
  );
}
