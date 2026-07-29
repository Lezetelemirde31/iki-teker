"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { VehicleArt } from "@/components/common/vehicle-art";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages, MessageKey } from "@/i18n/types";
import type { ArtTone } from "@/types";
import { cn } from "@/lib/utils";

const slides: {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  tone: ArtTone;
  shape: "motorcycles" | "scooters" | "parts" | "gear";
}[] = [
  { titleKey: "onboarding.slide1Title", bodyKey: "onboarding.slide1Body", tone: "slate", shape: "motorcycles" },
  { titleKey: "onboarding.slide2Title", bodyKey: "onboarding.slide2Body", tone: "amber", shape: "scooters" },
  { titleKey: "onboarding.slide3Title", bodyKey: "onboarding.slide3Body", tone: "olive", shape: "parts" },
  { titleKey: "onboarding.slide4Title", bodyKey: "onboarding.slide4Body", tone: "dusk", shape: "gear" },
];

/**
 * Four-panel intro. Advances by tap or horizontal drag, and the language picker
 * sits on the first screen a user ever sees — in a trilingual market that is a
 * first-class decision, not a settings-menu afterthought.
 */
export function OnboardingScreen({ locale, messages }: { locale: Locale; messages: Messages }) {
  const router = useRouter();
  const t = createTranslator(messages);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = slides[index]!;
  const isLast = index === slides.length - 1;
  const finish = () => router.replace(`/${locale}/home`);

  function go(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
        <LocaleSwitcher />
        <button
          type="button"
          onClick={finish}
          className="text-muted-foreground hover:text-foreground px-2 py-1 text-sm font-semibold transition-colors"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      <motion.div
        className="flex flex-1 flex-col"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(index + 1);
          else if (info.offset.x > 60) go(index - 1);
        }}
      >
        <div className="relative flex-1 overflow-hidden px-6 pt-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full flex-col"
            >
              <VehicleArt
                seed={`onboarding-${index}`}
                tone={slide.tone}
                shape={slide.shape}
                rounded="rounded-3xl"
                className="aspect-[4/3] w-full"
              />

              <h1 className="mt-8 text-[1.75rem] leading-[1.12] font-extrabold text-balance">
                {t(slide.titleKey)}
              </h1>
              <p className="text-muted-foreground mt-3 text-[0.9375rem] leading-relaxed text-pretty">
                {t(slide.bodyKey)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="safe-bottom shrink-0 space-y-4 px-6 pt-4 pb-5">
        <div className="flex justify-center gap-1.5" role="tablist" aria-label={t("app.name")}>
          {slides.map((_, dot) => (
            <button
              key={dot}
              type="button"
              role="tab"
              aria-selected={dot === index}
              aria-label={`${dot + 1}`}
              onClick={() => go(dot)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dot === index ? "bg-primary w-6" : "bg-border w-1.5",
              )}
            />
          ))}
        </div>

        <Button
          size="lg"
          block
          onClick={() => (isLast ? finish() : go(index + 1))}
          className="font-display uppercase"
        >
          {isLast ? t("onboarding.start") : t("common.next")}
        </Button>
      </div>
    </div>
  );
}
