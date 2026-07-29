import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 rounded-md font-bold tracking-wide whitespace-nowrap uppercase",
  {
    variants: {
      variant: {
        vip: "bg-vip text-vip-foreground",
        rental: "bg-rental text-rental-foreground",
        rentalSoft: "bg-rental-soft text-rental normal-case",
        muted: "bg-muted text-muted-foreground normal-case",
        outline: "border-border text-muted-foreground border normal-case",
        ink: "bg-secondary text-secondary-foreground",
        warning: "bg-warning-soft text-warning normal-case",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[0.5625rem]",
        md: "px-2 py-0.5 text-[0.625rem]",
      },
    },
    defaultVariants: { variant: "muted", size: "sm" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ variant, size }), className)} {...props} />;
}
