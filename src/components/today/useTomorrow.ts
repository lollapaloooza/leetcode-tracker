import { addDays } from '@/lib/_utils/date'
import { goalFor, isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'

/** Tomorrow's list: how many to pick toward its goal, and why each problem is on it. */
export function useTomorrow(today: string) {
  const tomorrow = addDays(today, 1)
  const planned = useTracker((s) => s.plans[tomorrow]?.length ?? 0)
  const goal = useTracker((s) => goalFor(s, tomorrow))
  const progress = useTracker((s) => s.progress)
  const studies = useTracker((s) => s.studies)
  const suggestForDay = useTracker((s) => s.suggestForDay)

  /** Watched tonight beats review beats new: it says what tomorrow's attempt is for. */
  const reasonFor = (id: number) =>
    studies.some((st) => st.id === id && st.date === today)
      ? { text: 'Watched today — now solve it', highlight: true }
      : { text: isSolved(progress[id]?.status) ? 'Review' : 'New', highlight: false }

  return {
    tomorrow,
    goal,
    pickLabel: planned === 0 ? `Pick ${goal}` : 'Add 1 more',
    pick: () => suggestForDay(tomorrow, today),
    reasonFor,
  }
}
