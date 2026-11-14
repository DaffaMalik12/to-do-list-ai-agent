"use client";

import { useEffect, useState } from "react";

/**
 * Hook generik untuk menunda nilai selama `delay` ms.
 * Digunakan oleh fitur pencarian agar tidak memicu request tiap ketikan.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
