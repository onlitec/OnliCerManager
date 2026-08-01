import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 *
 * Used to keep search boxes from firing an IPC round-trip (and a SQLite query)
 * on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(value); }, delayMs);
    return () => { clearTimeout(timer); };
  }, [value, delayMs]);

  return debounced;
}
