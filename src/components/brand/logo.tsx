import { cn } from "@/lib/utils";

const sizes = {
  sm: { mark: "size-6 text-[0.625rem] rounded-md", word: "text-base" },
  md: { mark: "size-8 text-xs rounded-lg", word: "text-xl" },
  lg: { mark: "size-11 text-base rounded-xl", word: "text-3xl" },
} as const;

/**
 * Brand lockup: yellow "IT" mark plus the IKI-TEKER wordmark, matching the
 * source prototype's header.
 */
export function Logo({
  size = "md",
  wordmark = true,
  className,
}: {
  size?: keyof typeof sizes;
  wordmark?: boolean;
  className?: string;
}) {
  const scale = sizes[size];

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "bg-primary text-primary-foreground font-display grid place-items-center font-extrabold tracking-tight",
          scale.mark,
        )}
        aria-hidden
      >
        IT
      </span>
      {wordmark && (
        <span className={cn("font-display font-extrabold tracking-tight", scale.word)}>
          IKI-TEKER
        </span>
      )}
      <span className="sr-only">IKI-TEKER</span>
    </span>
  );
}
