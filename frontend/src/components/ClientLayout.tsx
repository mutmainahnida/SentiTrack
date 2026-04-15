"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { LoginModal, LogoutModal } from "@/components/Auth";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <LoginModal />
      <LogoutModal />
    </ThemeProvider>
  );
}