import { Bike, Hammer, HardHat, KeyRound, Wrench, Zap } from "lucide-react";
import type { ComponentType } from "react";

import type { CategorySlug } from "@/types";

/** Line-art marks for the two vehicle types Lucide has no icon for. */
function MotorcycleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="presentation"
    >
      <circle cx="5" cy="16.5" r="3.5" />
      <circle cx="19" cy="16.5" r="3.5" />
      <path d="M5 16.5 8 12h5l2.5-2.5" />
      <path d="M15.5 9.5 19 16.5" />
      <path d="M8 12c2.4-2 5-2.4 6.5-1.5" />
      <path d="M14 9.5h3.5" />
    </svg>
  );
}

function ScooterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="presentation"
    >
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 17h8c2 0 2.6-1.6 3-3l1-5" />
      <path d="M17 9l2 8" />
      <path d="M15.5 7.5h3.5" />
      <path d="M7.5 14c2-2.6 4.5-2.9 6-2.4" />
    </svg>
  );
}

const registry: Record<CategorySlug, ComponentType<{ className?: string }>> = {
  motorcycles: MotorcycleIcon,
  scooters: ScooterIcon,
  electric: Zap,
  bicycles: Bike,
  parts: Wrench,
  gear: HardHat,
  services: Hammer,
  rental: KeyRound,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: CategorySlug;
  className?: string;
}) {
  const Icon = registry[slug];
  return <Icon className={className} />;
}
