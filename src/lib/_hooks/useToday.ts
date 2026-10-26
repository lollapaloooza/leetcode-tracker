import { useEffect, useState } from 'react'
import { localDate } from '@/lib/_utils/date'

/** Today's date that re-renders when the day changes while the tab stays open. */
export function useToday(): string {
  const [today, setToday] = useState(localDate)
  useEffect(() => {
    const tick = () => setToday(localDate())
    const timer = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return today
}
