/**
 * Absolute base URL for canonical links, hreflang alternates and Open Graph.
 *
 * Hardcoding the eventual domain is a trap: until it is bought and pointed at
 * the deployment, every canonical tag sends crawlers to a host that does not
 * resolve, which is worse than having no canonical at all. So the value is
 * resolved from the environment instead:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — set this once the real domain is live.
 *   2. Vercel's production domain — correct for the deployed prototype.
 *   3. localhost — development.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
