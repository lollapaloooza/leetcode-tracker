import { goalFor, suggestionCount } from '@/lib/domain'
import { useTracker } from '@/lib/store'

/** Suggest for today: enough to reach the goal, then one more at a time. */
export function useSuggest(today: string) {
  const planned = useTracker((s) => s.plans[today]?.length ?? 0)
  const goal = useTracker((s) => goalFor(s, today))
  const count = useTracker((s) => suggestionCount(s, today))
  const suggestForDay = useTracker((s) => s.suggestForDay)
  return {
    label: planned < goal ? `Suggest ${count}` : 'Suggest 1 more',
    suggest: () => suggestForDay(today, today),
  }
}
