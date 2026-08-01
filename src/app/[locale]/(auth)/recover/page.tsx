import { KeyRound, MessageCircle, RefreshCw, Smartphone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

/**
 * Getting back in.
 *
 * This is the "forgot password" of a passwordless system. There is no password
 * to reset — the credential is the phone itself — so the failure this screen has
 * to answer is different: the code did not arrive, or the number is no longer
 * reachable.
 *
 * The first three are things the user can fix in ten seconds and account for
 * nearly every case. The last one, a number they have genuinely lost, cannot be
 * automated: anything that moves an account to a new phone on request is a way
 * to take over an account. It goes to support with proof of identity.
 */
export default async function RecoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const steps = [
    { icon: Smartphone, key: "signal" },
    { icon: MessageCircle, key: "spam" },
    { icon: RefreshCw, key: "resend" },
    { icon: KeyRound, key: "lost" },
  ] as const;

  return (
    <>
      <AppHeader back title={t("auth.recoverTitle")} />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-6 py-8">
          <p className="text-muted-foreground text-sm text-pretty">{t("auth.recoverBody")}</p>

          <ol className="bg-card border-border divide-border divide-y rounded-xl border">
            {steps.map((step, index) => (
              <li key={step.key} className="flex items-start gap-3 px-3.5 py-3">
                <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
                  <step.icon className="size-4" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    <span className="text-subtle-foreground mr-1.5 text-xs">{index + 1}</span>
                    {t(`auth.recover.${step.key}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {t(`auth.recover.${step.key}Body` as Parameters<typeof t>[0])}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <Button size="lg" block className="font-display uppercase" asChild>
            <Link href={`/${locale}/login`}>{t("auth.backToLogin")}</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
