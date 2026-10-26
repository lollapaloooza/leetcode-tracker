import { addDays, localDate, parseDate } from '@/lib/_utils/date'
import { useTracker } from '@/lib/store'

/** The interview date: what's set, which days can be picked (from tomorrow on), and changing it. */
export function useInterviewDate(today: string) {
  const date = useTracker((s) => s.interview?.date ?? null)
  const setInterview = useTracker((s) => s.setInterview)
  return {
    date,
    selected: date ? parseDate(date) : undefined,
    // With no date yet, open the calendar a month out, roughly where an interview would be.
    month: parseDate(date ?? addDays(today, 30)),
    firstPickable: parseDate(addDays(today, 1)),
    pick: (day: Date) => setInterview(localDate(day), today),
    clear: () => setInterview(null, today),
  }
}
