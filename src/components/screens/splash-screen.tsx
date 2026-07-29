"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";

/**
 * Splash. Holds for a beat while the brand lands, then advances to onboarding.
 * Tapping anywhere skips the wait — a splash that traps you is a splash that
 * feels broken.
 */
export function SplashScreen({ locale, messages }: { locale: Locale; messages: Messages }) {
  const router = useRouter();
  const t = createTranslator(messages);
  const next = `/${locale}/onboarding`;

  useEffect(() => {
    router.prefetch(next);
    const timer = setTimeout(() => router.replace(next), 2100);
    return () => clearTimeout(timer);
  }, [router, next]);

  return (
    <button
      type="button"
      onClick={() => router.replace(next)}
      className="bg-secondary relative flex flex-1 flex-col items-center justify-center overflow-hidden text-left"
      aria-label={t("app.name")}
    >
      {/* Brand glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 38%, color-mix(in oklab, var(--primary) 26%, transparent), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <span className="bg-primary text-primary-foreground font-display grid size-20 place-items-center rounded-3xl text-2xl font-extrabold tracking-tight">
          IT
        </span>
        <span className="font-display text-secondary-foreground mt-5 text-3xl font-extrabold tracking-tight">
          IKI-TEKER
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-secondary-foreground/60 relative z-10 mt-3 max-w-[15rem] text-center text-sm text-balance"
      >
        {t("app.tagline")}
      </motion.p>

      {/* Loading hairline */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="bg-primary absolute bottom-0 left-0 h-0.5 w-full origin-left"
      />

      <div className="sr-only">
        <Logo />
      </div>
    </button>
  );
}
