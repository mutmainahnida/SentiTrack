"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isEntering, setIsEntering] = useState(true);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Exit: fade out + slide right
      setIsEntering(false);
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        prevPathname.current = pathname;
        // Small delay then enter
        requestAnimationFrame(() => {
          setIsEntering(true);
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Initial load: just enter
      setDisplayChildren(children);
      requestAnimationFrame(() => {
        setIsEntering(true);
      });
    }
  }, [pathname, children]);

  return (
    <div
      className={`w-full ${        isEntering
          ? "opacity-100 translate-x-0 transition-all duration-200 ease-out"
          : "opacity-0 translate-x-3 transition-all duration-150 ease-in"
      }`}
    >
      {displayChildren}
    </div>
  );
}
