"use client";

import { useId } from "react";

export interface TaskSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  errorMessage?: string | null;
  /**
   * Batas panjang input. Default 200 sesuai kontrak komponen.
   *
   * Catatan AC5 (input > 200 karakter → pesan inline pada input): dengan
   * `maxLength={200}` pengguna **tidak bisa** mengetik melewati 200, sehingga
   * jalur utama AC5 dilayani oleh `maxLength` (browser memblokir tambahan
   * karakter). Pesan inline dari backend (`400 VALIDATION_ERROR`,
   * `details[].path = "q"`) tetap ditampilkan lewat `errorMessage` bila
   * backend menolak (mis. keyword dari URL/prefill yang lebih panjang).
   */
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function TaskSearchInput({
  value,
  onChange,
  onClear,
  errorMessage = null,
  maxLength = 200,
  placeholder = "Cari tugas berdasarkan judul atau deskripsi…",
  disabled = false,
}: TaskSearchInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const hasError = Boolean(errorMessage);

  // Counter dihitung dari nilai MENTAH (selaras dengan `maxLength` browser).
  // Validasi panjang di hook memakai nilai ter-trim; keduanya konsisten karena
  // backend juga men-trim terlebih dahulu.
  const rawLength = value.length;
  const isAtLimit = rawLength >= maxLength;

  const describedBy = hasError ? `${errorId} ${hintId}` : hintId;

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Cari tugas
      </label>
      <div className="relative flex w-full min-w-0 items-center">
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={`w-full min-w-0 rounded-lg border px-3 py-2 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800 ${
            hasError
              ? "border-red-500 focus-visible:ring-red-500"
              : "border-zinc-300 focus-visible:border-zinc-500 focus-visible:ring-zinc-400 dark:border-zinc-700"
          }`}
        />
        {value.length > 0 && !disabled && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus kata kunci pencarian"
            className="absolute right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ×
            </span>
          </button>
        ) : null}
      </div>

      {/*
        STRATEGI A11Y (dipilih sadar & didokumentasikan di docs/frontend.md):
        - Input pencarian memakai `aria-live="polite"` (bukan `role="alert"`),
          karena pesan berubah cepat saat mengetik dan `alert` bersifat
          menginterupsi (assertive), membuat pengguna screen reader terganggu.
        - Error pada daftar hasil (TaskList) memakai `role="alert"` karena
          peristiwanya diskret (sekali per kegagalan request) dan butuh
          perhatian segera.
      */}
      <p
        id={errorId}
        aria-live="polite"
        className={
          hasError
            ? "text-xs font-medium text-red-600 dark:text-red-400"
            : "sr-only"
        }
      >
        {hasError ? errorMessage : ""}
      </p>

      <p
        id={hintId}
        className={
          isAtLimit
            ? "text-xs font-medium text-amber-600 dark:text-amber-400"
            : "text-xs text-zinc-500 dark:text-zinc-500"
        }
      >
        {rawLength}/{maxLength} karakter. Maksimal {maxLength} karakter.
      </p>
    </div>
  );
}
