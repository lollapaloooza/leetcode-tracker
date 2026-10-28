import { useRef, useState } from 'react'
import { problemById } from '@/data/problems'
import { useRetained } from '@/lib/_hooks/useRetained'
import type { Site } from '@/lib/domain'
import { usePrefs, useUI } from '@/lib/store'
import { startProblem } from './start-problem'

/**
 * The Start drawer: pick a site to open, or "Just start the timer" — either starts the timer,
 * exactly once. Closing the drawer (✕, Escape, a click outside) starts nothing.
 */
export function useStartSheet(today: string) {
  const id = useUI((s) => s.startFor)
  // Keep showing the problem while the drawer slides away.
  const problem = useRetained(id !== null ? (problemById.get(id) ?? null) : null)
  const [remember, setRemember] = useState(false)
  // The drawer opens from the store, not a trigger, so it puts focus back on the Start button itself.
  const opener = useRef<HTMLElement | null>(null)

  const finish = (site: Site | null) => {
    const ui = useUI.getState()
    if (ui.startFor === null) return
    const starting = problemById.get(ui.startFor)
    ui.closeStart()
    if (!starting) return
    if (remember) usePrefs.getState().setStartOpens(site ?? 'nothing')
    setRemember(false)
    startProblem(starting, today, site)
  }

  return {
    open: id !== null,
    problem,
    remember,
    setRemember,
    pick: (site: Site) => finish(site),
    justStart: () => finish(null),
    cancel: () => {
      useUI.getState().closeStart()
      setRemember(false)
    },
    focus: {
      onOpenAutoFocus: () => {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      },
      onCloseAutoFocus: (event: Event) => {
        event.preventDefault()
        if (opener.current?.isConnected) opener.current.focus()
        opener.current = null
      },
    },
  }
}
