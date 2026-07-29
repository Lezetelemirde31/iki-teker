import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[background-color,color,transform,opacity] select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-105",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-110",
        outline: "border-border bg-card text-foreground border hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        rental: "bg-rental text-rental-foreground hover:brightness-110",
        danger: "bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        // 44px is the smallest reliable touch target on iOS.
        sm: "h-9 px-3 text-xs [&_svg]:size-4",
        md: "h-11 px-4 text-sm [&_svg]:size-4",
        lg: "h-13 px-5 text-sm tracking-wide [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        iconSm: "size-9 [&_svg]:size-4",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };

export function Button({ className, variant, size, block, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(button({ variant, size, block }), className)} {...props} />
  );
}

export { button as buttonVariants };
