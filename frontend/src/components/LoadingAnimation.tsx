"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  "Scraping tweets",
  "Analyzing sentiment",
  "Processing results",
  "Finalizing data",
];

interface SpinningLoadingProps {
  className?: string;
}

export default function SpinningLoading({ className = "" }: SpinningLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 2000);
    return () => clearInterval(stepInterval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center gap-8 py-16 ${className}`}>
      {/* Main spinning orbs */}
      <div className="relative w-32 h-32">
        {/* Center glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-app-primary/20 to-blue-400/20 blur-xl animate-pulse" />

        {/* Orbiting circles */}
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-app-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border border-blue-400/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Core spinner */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-app-primary to-blue-500 flex items-center justify-center shadow-lg shadow-app-primary/30">
            <motion.div
              className="w-8 h-8 rounded-full bg-white/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>

        {/* Floating particles */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-app-primary"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, (i % 2 === 0 ? 1 : -1) * 40, 0],
              y: [0, (i < 2 ? 1 : -1) * 40, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Current step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-app-main">{STEPS[currentStep]}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}