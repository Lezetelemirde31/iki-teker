"use client";

import { useEffect, useRef, useState } from "react";

import { serialiseSearchQuery } from "@/lib/search-params";
import type { SearchQuery } from "@/types";

/**
 * How many listings a draft query would return, counted on the server.
 *
 * The filter sheet used to count against the in-bundle dataset, which only
 * worked while the whole catalogue shipped to the browser. Asking the server
 * keeps the number honest once the catalogue is a database, at the cost of a
 * round trip — so the request is debounced, and the previous answer stays on
 * the button while a new one is in flight rather than blinking to zero.
 *
 * Requests can also come back out of order, so each one carries a sequence
 * number and a stale reply is discarded.
 */
export function useMatchCount(
  draft: SearchQuery,
  engineBucket: string | undefined,
  { enabled = true, initial = 0 }: { enabled?: boolean; initial?: number } = {},
) {
  const [count, setCount] = useState(initial);
  const latest = useRef(0);

  const params = serialiseSearchQuery(draft, engineBucket).toString();

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const sequence = ++latest.current;

    const timer = setTimeout(() => {
      fetch(`/api/search/count?${params}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { count?: number } | null) => {
          // A slower earlier request must not overwrite a newer answer.
          if (sequence !== latest.current) return;
          if (typeof data?.count === "number") setCount(data.count);
        })
        .catch(() => {
          // Aborted or offline: keep showing the last known figure.
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [params, enabled]);

  return count;
}
