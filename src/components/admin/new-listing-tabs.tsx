"use client";

import { FileJson, PenLine } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Switching between the form and the JSON tool.
 *
 * Both are rendered on the server and passed in, so neither loses what has been
 * typed in it when the other is shown — half-written listings surviving a
 * mis-click is the whole point of doing it this way rather than with two pages.
 */
export function NewListingTabs({ form, bulk }: { form: ReactNode; bulk: ReactNode }) {
  const [tab, setTab] = useState<"form" | "bulk">("form");

  const button = (id: "form" | "bulk", icon: ReactNode, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        "border-border flex flex-1 items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-colors",
        tab === id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted",
      )}
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-subtle-foreground block text-[0.6875rem]">{hint}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {button("form", <PenLine className="size-4 shrink-0" />, "Forma", "Bir elan, addım-addım")}
        {button("bulk", <FileJson className="size-4 shrink-0" />, "Toplu", "JSON ilə yüzlərlə")}
      </div>

      <div className={tab === "form" ? "" : "hidden"}>{form}</div>
      <div className={tab === "bulk" ? "" : "hidden"}>{bulk}</div>
    </div>
  );
}
