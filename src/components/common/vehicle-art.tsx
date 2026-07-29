import type { ArtTone } from "@/types";
import { cn, seededRandom } from "@/lib/utils";

/**
 * Generated listing artwork.
 *
 * The source prototype uses flat tinted plates with a vehicle silhouette rather
 * than photography, so listings carry a tone plus a seed instead of an image
 * URL. Nothing is fetched: the demo runs offline and no image can fail to load
 * mid-presentation. The seed shifts the highlight position so two cards with
 * the same tone still look distinct.
 */

const tonePlate: Record<ArtTone, string> = {
  sand: "from-[#efe6d2] to-[#d3c09b] dark:from-[#3a352a] dark:to-[#241f17]",
  clay: "from-[#eed9c9] to-[#c9a48a] dark:from-[#3b2e26] dark:to-[#241a15]",
  olive: "from-[#e2e5cb] to-[#adb488] dark:from-[#33372a] dark:to-[#1e2118]",
  sage: "from-[#d9e6da] to-[#a3baa8] dark:from-[#28362c] dark:to-[#18211b]",
  slate: "from-[#dee2e7] to-[#a2acb8] dark:from-[#2b3037] dark:to-[#191d22]",
  steel: "from-[#e3e5e7] to-[#b0b5bb] dark:from-[#303235] dark:to-[#1c1e20]",
  dusk: "from-[#dfd9e6] to-[#a8a1b6] dark:from-[#332e3b] dark:to-[#1f1c25]",
  amber: "from-[#f7e8c2] to-[#e0c07f] dark:from-[#3d3520] dark:to-[#251f12]",
};

export type ArtShape = "motorcycles" | "scooters" | "electric" | "bicycles" | "parts" | "gear";

function Silhouette({ shape }: { shape: ArtShape }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (shape) {
    case "scooters":
      return (
        <g {...stroke}>
          <circle cx="24" cy="52" r="11" />
          <circle cx="94" cy="52" r="11" />
          <path d="M24 52h38q10 0 12-10l4-18" />
          <path d="M78 24l16 28" />
          <path d="M72 20h16" />
          <path d="M34 44q10-13 24-11l4 13" />
        </g>
      );
    case "electric":
      return (
        <g {...stroke}>
          <circle cx="26" cy="54" r="9" />
          <circle cx="94" cy="54" r="9" />
          <path d="M26 54h56" />
          <path d="M82 54l3-32" />
          <path d="M85 22l9 32" />
          <path d="M74 19h22" />
        </g>
      );
    case "bicycles":
      return (
        <g {...stroke}>
          <circle cx="26" cy="48" r="16" />
          <circle cx="94" cy="48" r="16" />
          <path d="M26 48h30l-8-26H26" />
          <path d="M48 22h30L56 48" />
          <path d="M78 22l16 26" />
          <path d="M73 17h13" />
        </g>
      );
    case "parts":
      return (
        <g {...stroke}>
          <circle cx="60" cy="36" r="20" />
          <circle cx="60" cy="36" r="8" />
          <path d="M60 8v8M60 56v8M32 36h8M80 36h8" />
          <path d="M40 16l6 6M80 50l-6-6M80 22l-6 6M40 56l6-6" />
        </g>
      );
    case "gear":
      return (
        <g {...stroke}>
          <path d="M28 44a32 26 0 0 1 64 0v10H44a16 16 0 0 1-16-16z" />
          <path d="M44 54v6a4 4 0 0 0 4 4h40" />
          <path d="M52 30q14-8 30 0" />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <circle cx="26" cy="48" r="14" />
          <circle cx="94" cy="48" r="14" />
          <path d="M26 48l14-16h22l10-10" />
          <path d="M72 22l22 26" />
          <path d="M40 32q12-10 26-6" />
          <path d="M30 34h14" />
          <path d="M68 18h14" />
        </g>
      );
  }
}

export function VehicleArt({
  seed,
  tone,
  shape,
  className,
  rounded = "rounded-md",
}: {
  seed: string;
  tone: ArtTone;
  shape: ArtShape;
  className?: string;
  rounded?: string;
}) {
  // Deterministic per-listing highlight placement.
  const drift = seededRandom(seed);
  const highlightX = 20 + drift * 60;
  const highlightY = 8 + drift * 26;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-br",
        tonePlate[tone],
        rounded,
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(60% 55% at ${highlightX}% ${highlightY}%, rgb(255 255 255 / 0.5), transparent 70%)`,
        }}
      />
      <svg
        viewBox="0 0 120 72"
        className="absolute inset-0 size-full text-black/25 dark:text-white/25"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <Silhouette shape={shape} />
      </svg>
      <div className="ring-foreground/5 absolute inset-0 rounded-[inherit] ring-1 ring-inset" />
    </div>
  );
}
