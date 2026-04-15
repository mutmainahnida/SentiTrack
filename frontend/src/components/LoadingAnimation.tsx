"use client";

import Lottie from "lottie-react";
import loadingDots from "../../public/animations/loading-dots.json";

const MESSAGES = [
  "Lagi ngumpulin ketikan netizen...",
  "Memilah komentar pedas, normal, dan manis...",
  "Sabar ya, data lagi diolah biar jadi informasi yang berguna...",
  "Data sebentar lagi siap disajikan...",
];

interface LoadingAnimationProps {
  messageIndex?: number;
  className?: string;
}

export default function LoadingAnimation({ messageIndex = 0, className = "" }: LoadingAnimationProps) {
  const message = MESSAGES[messageIndex] ?? MESSAGES[0];

  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 ${className}`}>
      <div className="w-28 h-28">
        <Lottie
          animationData={loadingDots}
          loop
          autoplay
        />
      </div>
      <p className="text-center text-base md:text-lg text-app-muted dark:text-app-muted font-medium max-w-sm animate-pulse">
        {message}
      </p>
    </div>
  );
}

export { MESSAGES };