"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ResolvedTheme,
  ThemePreference,
} from "@/features/theme/types/theme.types";

/**
 * Kunci penyimpanan preferensi tema di localStorage.
 * WAJIB sama dengan yang dibaca inline script anti-FOUC di `src/app/layout.tsx`.
 */
export const THEME_STORAGE_KEY = "todoagent-theme";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

/** Nama custom event lintas-komponen saat preferensi tema berubah. */
const THEME_CHANGE_EVENT = "todoagent:theme-change";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  if (preference === "system") {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
  }
  return preference;
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/** Selaraskan class `reduce-motion` ketika preferensi sistem berubah. */
function applyMotionPreference(): void {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle(
    "reduce-motion",
    window.matchMedia(MOTION_MEDIA_QUERY).matches,
  );
}

/**
 * Hook tema `light | dark | system`.
 *
 * PEMBAGIAN TANGGUNG JAWAB LISTENER (perbaikan temuan QA):
 * - Inline script di `<head>` HANYA bertugas sekali saat halaman dimuat
 *   (anti-FOUC): menetapkan class `dark`/`reduce-motion` sebelum paint.
 * - Seluruh listener `matchMedia` runtime (perubahan tema OS & reduced-motion)
 *   didaftarkan HANYA oleh hook ini, bukan oleh inline script. Dengan begitu
 *   tidak ada listener duplikat dan tidak ada kebocoran saat HMR/unmount.
 * - Sinkronisasi antar instance hook memakai custom event
 *   `todoagent:theme-change` + event `storage` (lintas tab).
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Sinkronkan state dengan preferensi yang sudah diterapkan inline script.
  useEffect(() => {
    const initial = readStoredPreference();
    setPreferenceState(initial);
    setResolved(resolveTheme(initial));
    applyTheme(resolveTheme(initial));
    applyMotionPreference();
    setMounted(true);
  }, []);

  // Reaksi setiap preferensi berubah (light/dark/system).
  useEffect(() => {
    if (!mounted) return;
    const next = resolveTheme(preference);
    setResolved(next);
    applyTheme(next);
  }, [preference, mounted]);

  // Perubahan preferensi tema OS — hanya didaftarkan oleh hook ini.
  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = () => {
      if (readStoredPreference() !== "system") return;
      const next: ResolvedTheme = media.matches ? "dark" : "light";
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mounted]);

  // Perubahan prefers-reduced-motion — hanya didaftarkan oleh hook ini.
  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia(MOTION_MEDIA_QUERY);
    const handleChange = () => applyMotionPreference();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mounted]);

  // Sinkronisasi lintas instance hook & lintas tab.
  useEffect(() => {
    if (!mounted) return;

    const handleExternalChange = () => {
      const next = readStoredPreference();
      setPreferenceState(next);
      const nextResolved = resolveTheme(next);
      setResolved(nextResolved);
      applyTheme(nextResolved);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        handleExternalChange();
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleExternalChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleExternalChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [mounted]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* localStorage tidak tersedia (private mode) — abaikan. */
    }
    const nextResolved = resolveTheme(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { preference, resolved, setPreference, mounted };
}
