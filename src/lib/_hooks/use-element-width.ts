import { useLayoutEffect, useState, type RefObject } from 'react'

/** The element's content width, kept current as it resizes. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  // Layout effect: measure before first paint, so whatever is sized from it doesn't flash at zero.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
