// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { attempt, idOf, progressOf, tracker } from '@/test/builders'
import type { TrackerData } from '@/types'
import { blankFor, changedItemIds, itemsOf, meaningful, same, withItems } from './items'

const twoSum = idOf('Two Sum')
const data: TrackerData = tracker({
  progress: progressOf('solved', 'Two Sum'),
  reviews: { [twoSum]: { step: 0, due: '2026-10-30' } },
  notes: { [twoSum]: 'hash map of complements' },
  complexity: { [twoSum]: { time: 'O(n)', space: 'O(n)' } },
  attempts: [attempt('Two Sum', '2026-10-27')],
  studies: [{ key: 'study-1-5', id: 1, date: '2026-10-26', at: '2026-10-26T10:00:00.000Z' }],
  plans: { '2026-10-27': [{ id: twoSum, done: true }] },
  backlog: [7],
  weekdayGoal: 2,
  weekendGoal: 4,
  weeklyDays: 5,
  coreFirst: false,
  interview: { date: '2026-12-15', setOn: '2026-10-01', solvedAtSet: 3 },
  timer: { id: twoSum, startedAt: null, elapsed: 5000 },
  comebackAt: '2026-10-20',
})

describe('itemsOf / withItems', () => {
  it('splits the data into one item per problem, attempt, study and day, plus the backlog and settings', () => {
    const items = itemsOf(data)
    expect([...items.keys()].sort()).toEqual(
      [`problem:${twoSum}`, `attempt:${data.attempts[0].key}`, 'study:study-1-5', 'plan:2026-10-27', 'backlog', 'settings'].sort(),
    )
    expect(items.get(`problem:${twoSum}`)).toEqual({
      progress: data.progress[twoSum],
      review: data.reviews[twoSum],
      note: 'hash map of complements',
      complexity: { time: 'O(n)', space: 'O(n)' },
    })
    expect(items.get('settings')).toEqual({ weekdayGoal: 2, weekendGoal: 4, weeklyDays: 5, coreFirst: false, interview: data.interview })
  })

  it('keeps the running timer and the welcome-back day out of the items', () => {
    expect(JSON.stringify([...itemsOf(data).values()])).not.toContain('5000')
    expect(JSON.stringify([...itemsOf(data).values()])).not.toContain('2026-10-20')
  })

  // Every synced field holds a non-default value above, so a field left out of the items fails here.
  it('joins the items back into the same data', () => {
    expect(withItems(blankFor(data), itemsOf(data))).toEqual(data)
  })

  it('removes an item set to null', () => {
    const next = withItems(data, [
      [`problem:${twoSum}`, null],
      [`attempt:${data.attempts[0].key}`, null],
      ['plan:2026-10-27', null],
    ])
    expect(next.progress).toEqual({})
    expect(next.notes).toEqual({})
    expect(next.attempts).toEqual([])
    expect(next.plans).toEqual({})
  })

  it('checks fetched items like any saved data', () => {
    const next = withItems(data, [['attempt:bad', { key: 'bad' }], ['backlog', 'nonsense']])
    expect(next.attempts).toEqual(data.attempts)
    expect(next.backlog).toEqual([])
  })
})

describe('changedItemIds', () => {
  it('names only the items a change touched', () => {
    const next: TrackerData = {
      ...data,
      notes: { ...data.notes, [twoSum]: 'two pointers' },
      plans: { ...data.plans, '2026-10-28': [] },
      weekendGoal: 5,
    }
    expect(changedItemIds(data, next).sort()).toEqual([`problem:${twoSum}`, 'plan:2026-10-28', 'settings'].sort())
  })

  it('sees an added and a removed attempt', () => {
    const added = attempt('Two Sum', '2026-10-28')
    expect(changedItemIds(data, { ...data, attempts: [added] }).sort()).toEqual([`attempt:${added.key}`, `attempt:${data.attempts[0].key}`].sort())
  })

  it('ignores the timer', () => {
    expect(changedItemIds(data, { ...data, timer: null })).toEqual([])
  })
})

describe('meaningful', () => {
  it('drops what a fresh start holds anyway: default settings, an empty backlog or day', () => {
    const fresh = itemsOf({ ...TRACKER_DEFAULTS, plans: { '2026-10-28': [] } })
    expect(meaningful(fresh).size).toBe(0)
    expect([...meaningful(itemsOf(data)).keys()]).toContain('settings')
  })
})

describe('same', () => {
  it('ignores key order and missing fields', () => {
    expect(same({ a: 1, b: { c: 2, d: undefined } }, { b: { c: 2 }, a: 1 })).toBe(true)
    expect(same({ a: 1 }, { a: 2 })).toBe(false)
    expect(same(undefined, null)).toBe(true)
  })
})
