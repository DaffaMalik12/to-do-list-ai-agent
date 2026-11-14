"use client";

import { useEffect, useState } from "react";

/**
 * Mengembalikan nilai yang tertunda selama `delay` ms setelah perubahan terakhir.
 * Berguna untuk input pencarian agar tidak memicu request pada setiap ketikan.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
