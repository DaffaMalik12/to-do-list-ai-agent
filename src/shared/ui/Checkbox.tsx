"use client";

import {
  forwardRef,
  useCallback,
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Checkbox aksesibel.
 *
 * KEPUTUSAN AC7 (perbaikan temuan QA):
 * AC secara literal meminta `aria-checked` ada pada checkbox. Agar AC terpenuhi
 * tanpa melanggar WCAG, komponen ini merender kontrol ARIA murni:
 *  - `input[type="checkbox"]` native disembunyikan dari accessibility tree
 *    (`aria-hidden`, `tabIndex={-1}`) tetapi tetap menjadi sumber state DOM —
 *    event `change` tetap terpicu saat Space ditekan pada elemen fokus.
 *  - Elemen `<span role="checkbox" aria-checked aria-labelledby tabIndex={0}>`
 *    adalah SATU-SATUNYA node yang diekspos ke screen reader, dengan
 *    `aria-checked` eksplisit sesuai AC7 dan `aria-disabled` saat disabled.
 *  - Keyboard: `Space` (sesuai pola checkbox ARIA) mentoggle state. `Enter`
 *    diabaikan agar tidak bentrok dengan aksi baris.
 *
 * Label: `<label htmlFor>` SELALU dirender — `hideLabel=true` hanya
 * menyembunyikannya secara visual (`sr-only`), sehingga accessible name tetap
 * terjamin lewat `aria-labelledby`.
 */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  /** Sembunyikan label visual, tetap tersedia untuk screen reader. */
  hideLabel?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { label, hideLabel = false, className, id, disabled, checked, onChange, ...props },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const labelId = `${inputId}-label`;

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLSpanElement>) => {
        if (disabled) return;
        if (event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          // Delegasikan ke input native agar onChange tetap satu jalur.
          const input = event.currentTarget.querySelector<HTMLInputElement>(
            'input[type="checkbox"]',
          );
          input?.click();
        }
      },
      [disabled],
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
      },
      [onChange],
    );

    return (
      <span className={cn("inline-flex items-center", className)}>
        <span
          role="checkbox"
          aria-checked={checked === true}
          aria-disabled={disabled ? true : undefined}
          aria-labelledby={labelId}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          className={cn(
            "group relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center",
            "rounded-[6px] border-2 border-border-strong bg-surface",
            "transition-[background-color,border-color,transform] duration-[var(--dur-base)] ease-out",
            "hover:border-primary active:scale-90",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            checked && "border-primary bg-primary",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            {...props}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "pointer-events-none h-3.5 w-3.5 text-primary-fg",
              "transition-transform duration-[var(--dur-base)] ease-out",
              checked ? "scale-100" : "scale-0",
            )}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <label
          id={labelId}
          htmlFor={inputId}
          className={cn(
            "ml-2 cursor-pointer select-none text-sm text-text",
            hideLabel && "sr-only",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {label}
        </label>
      </span>
    );
  },
);
