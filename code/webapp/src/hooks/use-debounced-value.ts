import { useEffect, useState } from 'react'

/**
 * Returns `value` delayed by `delayMs`, resetting the timer on every change.
 * Used to throttle name-driven SKU suggestion requests to one per pause in
 * typing instead of one per keystroke (#500).
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
