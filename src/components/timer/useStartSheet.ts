import { useState } from 'react'
import { problemById } from '@/data/problems'
import { useRetained } from '@/lib/_hooks/useRetained'
import type { Site } from '@/lib/domain'
import { usePrefs, useUI } from '@/lib/store'
import { startProblem } from './start-problem'

/**
 * The Start drawer: pick a site to open, or close it to start only the timer. Either way the
 * timer starts, exactly once.
 */
export function useStartSheet(today: string) {
  const id = useUI((s) => s.startFor)
  // Keep showing the problem while the drawer slides away.
  const problem = useRetained(id !== null ? (problemById.get(id) ?? null) : null)
  const [remember, setRemember] = useState(false)

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
  }
}
