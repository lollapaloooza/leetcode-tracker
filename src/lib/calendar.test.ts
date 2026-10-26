import { describe, expect, it } from 'vitest'
import { buildIcs, type CalendarBlock } from './calendar'

const weekdays: CalendarBlock = { days: [1, 3], time: '19:00', minutes: 30, title: 'LeetCode — one problem' }
const sundayNoon = new Date(2026, 9, 25, 12, 0)

const lines = (ics: string) => ics.split('\r\n')
const field = (ics: string, name: string) => lines(ics).filter((l) => l.startsWith(`${name}:`))

describe('buildIcs', () => {
  it('wraps events in a calendar with CRLF line endings only', () => {
    const ics = buildIcs([weekdays], 'https://example.test', sundayNoon)
    expect(lines(ics)[0]).toBe('BEGIN:VCALENDAR')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('repeats weekly on the chosen days, with a 5-minute reminder', () => {
    const ics = buildIcs([weekdays], 'https://example.test', sundayNoon)
    expect(field(ics, 'RRULE')).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'])
    expect(field(ics, 'TRIGGER')).toEqual(['TRIGGER:-PT5M'])
    expect(field(ics, 'URL')).toEqual(['URL:https://example.test'])
  })

  it('starts on the first chosen day whose time is still ahead', () => {
    expect(field(buildIcs([weekdays], '', sundayNoon), 'DTSTART')).toEqual(['DTSTART:20261026T190000'])
    expect(field(buildIcs([weekdays], '', sundayNoon), 'DTEND')).toEqual(['DTEND:20261026T193000'])
    // Monday before 19:00 starts that evening; after 19:00 it moves on to Wednesday.
    expect(field(buildIcs([weekdays], '', new Date(2026, 9, 26, 18, 0)), 'DTSTART')).toEqual(['DTSTART:20261026T190000'])
    expect(field(buildIcs([weekdays], '', new Date(2026, 9, 26, 20, 0)), 'DTSTART')).toEqual(['DTSTART:20261028T190000'])
  })

  it('keeps floating local times across a daylight-saving change', () => {
    const sunday: CalendarBlock = { days: [0], time: '19:00', minutes: 90, title: 'Weekend' }
    const ics = buildIcs([sunday], '', new Date(2026, 9, 31, 12, 0))
    expect(field(ics, 'DTSTART')).toEqual(['DTSTART:20261101T190000'])
    expect(field(ics, 'DTEND')).toEqual(['DTEND:20261101T203000'])
  })

  it('lists BYDAY in calendar order', () => {
    const weekend: CalendarBlock = { days: [6, 0], time: '10:00', minutes: 90, title: 'Weekend' }
    expect(field(buildIcs([weekend], '', sundayNoon), 'RRULE')).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=SU,SA'])
  })

  it('escapes text the way iCalendar requires', () => {
    const tricky: CalendarBlock = { ...weekdays, title: 'One; two, three\\four\nfive' }
    expect(field(buildIcs([tricky], '', sundayNoon), 'SUMMARY')).toEqual(['SUMMARY:One\\; two\\, three\\\\four\\nfive'])
  })

  it('skips blocks without days and gives each event its own UID', () => {
    const ics = buildIcs([weekdays, { ...weekdays, days: [] }, { ...weekdays, days: [5] }], '', sundayNoon)
    const uids = field(ics, 'UID')
    expect(field(ics, 'BEGIN').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2)
    expect(new Set(uids).size).toBe(2)
  })
})
