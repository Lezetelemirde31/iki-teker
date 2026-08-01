import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { isSignedIn } from "@/server/session";

/**
 * The sign-in screens.
 *
 * Outside the (app) group on purpose: no bottom navigation, because a half
 * signed-in person tapping through to Favourites and finding nothing is worse
 * than a screen with one job. The device frame still wraps it — that comes from
 * the root layout.
 *
 * Already signed in? There is nothing here for you.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (await isSignedIn()) redirect(`/${locale}/account`);

  return <PageTransition>{children}</PageTransition>;
}
