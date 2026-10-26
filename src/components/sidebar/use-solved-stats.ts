import { useMemo } from 'react'
import { PROBLEMS } from '@/data/problems'
import { DIFFICULTIES } from '@/lib/_consts/enums'
import { isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import type { Difficulty } from '@/types'

/** Solved counts overall and per difficulty. */
export function useSolvedStats() {
  const progress = useTracker((s) => s.progress)
  return useMemo(() => {
    const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { solved: 0, total: 0 }])) as Record<
      Difficulty,
      { solved: number; total: number }
    >
    let solved = 0
    for (const p of PROBLEMS) {
      byDifficulty[p.difficulty].total++
      if (isSolved(progress[p.id]?.status)) {
        byDifficulty[p.difficulty].solved++
        solved++
      }
    }
    return { solved, total: PROBLEMS.length, byDifficulty }
  }, [progress])
}
