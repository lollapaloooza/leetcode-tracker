import { useEffect, useRef, useState } from 'react'

/** Calls `onDone` after `ms`, holding the countdown while paused (hovered or focused), so Undo stays in reach. */
export function useToastTimer(ms: number, onDone: () => void) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(ms)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = setTimeout(() => done.current(), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused])

  return { paused, pause: () => setPaused(true), resume: () => setPaused(false) }
}
