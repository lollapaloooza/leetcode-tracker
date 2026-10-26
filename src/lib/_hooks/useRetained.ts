import { useState } from 'react'

/** The last non-null value, so a dialog keeps showing its content while it animates closed. */
export function useRetained<T>(value: T | null): T | null {
  const [retained, setRetained] = useState(value)
  if (value !== null && value !== retained) setRetained(value)
  return value ?? retained
}
