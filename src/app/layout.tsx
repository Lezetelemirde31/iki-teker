import type { ReactNode } from "react";

import "./globals.css";

/**
 * Root layout is intentionally a pass-through. `<html>` and `<body>` are
 * emitted by `app/[locale]/layout.tsx`, which is the first layer that knows
 * which language and text direction to declare.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
