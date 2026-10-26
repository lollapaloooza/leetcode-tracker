import { describe, expect, it } from 'vitest'
import {
  addDays,
  diffDays,
  formatDuration,
  formatLongDay,
  formatRelative,
  formatShortDay,
  isWeekend,
  localDate,
  saturdayAhead,
  weekStart,
} from './date'

// 2026: US daylight saving starts Sun Mar 8 and ends Sun Nov 1. Oct 25 is a Sunday.

describe('test setup', () => {
  it('runs in a time zone with daylight saving, so the DST cases below mean something', () => {
    expect(new Date(2026, 2, 7).getTimezoneOffset()).not.toBe(new Date(2026, 2, 9).getTimezoneOffset())
  })
})

describe('localDate', () => {
  it('formats the local calendar day, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it("uses the local day, not UTC's, late in the evening", () => {
    expect(localDate(new Date(2026, 9, 25, 23, 30))).toBe('2026-10-25')
  })
})

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('crosses daylight-saving changes without skipping or repeating a day', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
  })
})

describe('diffDays', () => {
  it('counts whole days, positive when the second date is later', () => {
    expect(diffDays('2026-10-25', '2026-10-28')).toBe(3)
    expect(diffDays('2026-10-28', '2026-10-25')).toBe(-3)
    expect(diffDays('2026-10-25', '2026-10-25')).toBe(0)
  })

  it('is exact across daylight-saving changes', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2)
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2)
    expect(diffDays('2026-01-01', '2027-01-01')).toBe(365)
  })
})

describe('isWeekend', () => {
  it('is true on Saturday and Sunday only', () => {
    expect(isWeekend('2026-10-24')).toBe(true)
    expect(isWeekend('2026-10-25')).toBe(true)
    expect(isWeekend('2026-10-26')).toBe(false)
    expect(isWeekend('2026-10-30')).toBe(false)
  })
})

describe('weekStart', () => {
  it('returns the Monday of a Mon–Sun week', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26')
    expect(weekStart('2026-10-28')).toBe('2026-10-26')
    expect(weekStart('2026-11-01')).toBe('2026-10-26')
  })

  it('puts Sunday at the end of its week, not the start of the next', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19')
  })
})

describe('saturdayAhead', () => {
  it('is the coming Saturday from Sunday through Thursday', () => {
    expect(saturdayAhead('2026-10-25')).toBe('2026-10-31')
    expect(saturdayAhead('2026-10-26')).toBe('2026-10-31')
    expect(saturdayAhead('2026-10-29')).toBe('2026-10-31')
  })

  it('is null when Saturday is tomorrow or today — "move to tomorrow" already covers it', () => {
    expect(saturdayAhead('2026-10-30')).toBeNull()
    expect(saturdayAhead('2026-10-31')).toBeNull()
  })
})

describe('formatRelative', () => {
  const today = '2026-10-25'

  it('names nearby days', () => {
    expect(formatRelative(today, today)).toBe('today')
    expect(formatRelative('2026-10-26', today)).toBe('tomorrow')
    expect(formatRelative('2026-10-24', today)).toBe('yesterday')
    expect(formatRelative('2026-10-30', today)).toBe('in 5 days')
  })

  it('falls back to a short date two weeks out or in the past', () => {
    expect(formatRelative('2026-11-14', today)).toBe(formatShortDay('2026-11-14'))
    expect(formatRelative('2026-10-20', today)).toBe(formatShortDay('2026-10-20'))
  })
})

describe('formatDuration', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(61_000)).toBe('1:01')
    expect(formatDuration(59_999)).toBe('0:59')
    expect(formatDuration(90 * 60_000)).toBe('90:00')
  })

  it('never shows negative time', () => {
    expect(formatDuration(-5_000)).toBe('0:00')
  })
})

describe('formatLongDay', () => {
  it('spells out the weekday and month, for headings', () => {
    expect(formatLongDay('2026-10-26')).toBe('Monday, October 26')
  })
})
