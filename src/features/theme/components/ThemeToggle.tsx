"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/features/theme/hooks/useTheme";
import type { ThemePreference } from "@/features/theme/types/theme.types";
import { cn } from "@/shared/lib/cn";

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Sistem" },
];

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const ICONS: Record<ThemePreference, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <SystemIcon />,
};

export function ThemeToggle() {
  const { preference, setPreference, mounted } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Pilih tema tampilan"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mounted && preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tema ${option.label}`}
            title={`Tema ${option.label}`}
            onClick={() => setPreference(option.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              "transition-colors duration-[var(--dur-fast)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary text-primary-fg"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
            )}
          >
            {ICONS[option.value]}
          </button>
        );
      })}
    </div>
  );
}
