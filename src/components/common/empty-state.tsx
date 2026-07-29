import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="bg-muted text-muted-foreground mb-4 grid size-14 place-items-center rounded-2xl">
        {icon ?? <SearchX className="size-6" strokeWidth={1.7} />}
      </div>
      <p className="font-display text-base font-bold">{title}</p>
      {body && <p className="text-muted-foreground mt-1.5 max-w-[16rem] text-sm text-pretty">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
