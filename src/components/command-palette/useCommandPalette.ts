import { useState, type KeyboardEvent } from 'react'
import { problemById } from '@/data/problems'
import { useUI } from '@/lib/store'

/** Runs a command, then closes the palette. */
export type Run = (command: () => void) => void

/** The palette's state: what's typed, and the problem whose actions are showing once one is picked. */
export function useCommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  const [problemId, setProblemId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const showProblem = (id: number | null) => {
    setProblemId(id)
    setSearch('')
  }
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) showProblem(null)
  }
  const run: Run = (command) => {
    command()
    onOpenChange(false)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    // Backspace on an empty search steps back out of a problem's actions.
    if (e.key === 'Backspace' && search === '' && problemId !== null) {
      e.preventDefault()
      showProblem(null)
    }
  }

  return {
    open,
    onOpenChange,
    run,
    onKeyDown,
    search,
    // "#217" finds problem 217: the number is part of each item's search value, the # isn't.
    setSearch: (value: string) => setSearch(value.replace(/^#/, '')),
    problem: problemId !== null ? problemById.get(problemId) : undefined,
    pick: (id: number) => showProblem(id),
    back: () => showProblem(null),
  }
}
