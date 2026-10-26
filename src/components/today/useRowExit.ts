import { useState, type AnimationEvent } from 'react'
import { prefersMotion } from '@/lib/_utils/browser'

/** Let a row slide out and fold away before `commit` takes it off the list (at once under reduced motion). */
export function useRowExit(commit: (() => void) | undefined) {
  const [leaving, setLeaving] = useState(false)
  return {
    leaving,
    exit: commit && (() => (prefersMotion() ? setLeaving(true) : commit())),
    onAnimationEnd: (e: AnimationEvent) => {
      if (leaving && e.animationName === 'row-out') commit?.()
    },
  }
}
