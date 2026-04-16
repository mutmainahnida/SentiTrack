"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ThemeProvider } from "./ThemeProvider";
import { LogoutModal } from "./Auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <ThemeProvider>
      {children}
      {mounted && createPortal(<LogoutModal />, document.body)}
    </ThemeProvider>
  );
}
