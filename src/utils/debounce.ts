export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Helper debounce murni (testable) tanpa dependensi React.
 * Menunda eksekusi `fn` hingga `delay` ms setelah pemanggilan terakhir.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): DebouncedFunction<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  const flush = (): void => {
    if (timer !== null && lastArgs !== null) {
      clearTimeout(timer);
      timer = null;
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const debounced = ((...args: Args): void => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const currentArgs = lastArgs;
      lastArgs = null;
      if (currentArgs !== null) {
        fn(...currentArgs);
      }
    }, delay);
  }) as DebouncedFunction<Args>;

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced;
}
