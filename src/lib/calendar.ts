/** A recurring practice block, e.g. Mon–Thu at 19:00 for 30 minutes. */
export interface CalendarBlock {
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  /** "HH:MM", local time */
  time: string
  minutes: number
  title: string
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/**
 * An .ics file with one weekly-recurring event per block. Times are "floating" (no time zone),
 * so calendar apps place them at that local time wherever you are.
 */
export function buildIcs(blocks: CalendarBlock[], url: string, from = new Date()): string {
  const now = new Date()
  const utcStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = blocks
    .filter((b) => b.days.length > 0)
    .map((b, i) => {
      const [h, m] = b.time.split(':').map(Number)
      // DTSTART must be an occurrence: the first chosen weekday from today on whose time hasn't passed.
      const start = new Date(from)
      start.setHours(h, m, 0, 0)
      while (!b.days.includes(start.getDay()) || start < from) start.setDate(start.getDate() + 1)
      const end = new Date(start.getTime() + b.minutes * 60_000)
      const byDay = [...b.days].sort().map((d) => BYDAY[d]).join(',')
      return [
        'BEGIN:VEVENT',
        `UID:leetcode-tracker-${now.getTime()}-${i}@localhost`,
        `DTSTAMP:${utcStamp}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
        `SUMMARY:${escape(b.title)}`,
        `DESCRIPTION:${escape(`Open the tracker and press Start: ${url}`)}`,
        `URL:${url}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escape(b.title)}`,
        'TRIGGER:-PT5M',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LeetCode Tracker//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n')
}
