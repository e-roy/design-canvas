export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T {
  let last = 0;
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}
