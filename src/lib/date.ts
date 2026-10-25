import { useEffect, useState } from 'react'

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" flips at your midnight). */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + days)
  return localDate(d)
}

/** Whole days from `a` to `b` (positive when `b` is later). DST-safe. */
export function diffDays(a: string, b: string): number {
  const utc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

export function isWeekend(date: string): boolean {
  const day = parseDate(date).getDay()
  return day === 0 || day === 6
}

/** The coming Saturday, when it's further away than tomorrow — where a Hard can wait for the long weekend session. */
export function saturdayAhead(date: string): string | null {
  const days = 6 - parseDate(date).getDay()
  return days >= 2 ? addDays(date, days) : null
}

/** Monday of the week containing `date` (weeks run Mon–Sun). */
export function weekStart(date: string): string {
  return addDays(date, -((parseDate(date).getDay() + 6) % 7))
}

export function formatDay(date: string): string {
  return parseDate(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatShortDay(date: string): string {
  return parseDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** "today", "tomorrow", "in 3 days", "Oct 14". */
export function formatRelative(date: string, today: string): string {
  const days = diffDays(today, date)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1 && days < 14) return `in ${days} days`
  return formatShortDay(date)
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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

/** Current epoch ms, ticking every second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}
