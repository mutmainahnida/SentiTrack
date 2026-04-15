"use client";

import { useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoginModal, LogoutModal, RegisterModal } from "@/components/Auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <ThemeProvider>
      {children}
      {showRegister ? (
        <RegisterModal
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <LoginModal
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
      <LogoutModal />
    </ThemeProvider>
  );
}
