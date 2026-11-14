"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface CollapsibleProps {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function Collapsible({
  title,
  count,
  defaultOpen = true,
  children,
  className,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left",
            "text-xs font-semibold uppercase tracking-wide text-text-muted",
            "transition-colors duration-[var(--dur-fast)] hover:text-text",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-[var(--dur-base)]",
              open ? "rotate-90" : "rotate-0",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>{title}</span>
          {typeof count === "number" ? (
            <span className="ml-1 rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium tabular-nums text-text-muted">
              {count}
            </span>
          ) : null}
        </button>
      </h2>
      {open ? (
        <div id={contentId} className="flex flex-col">
          {children}
        </div>
      ) : null}
    </section>
  );
}
