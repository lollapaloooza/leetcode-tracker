import { describe, expect, it } from 'vitest'
import { DEFAULTS, exportable, isTrackerData, normalize } from './persistence'
import { attempt, idOf, progressOf } from './test-utils'

describe('normalize', () => {
  it('turns anything that is not an object into the defaults', () => {
    for (const raw of [undefined, null, 'x', 42, [], [1, 2]]) expect(normalize(raw)).toEqual(DEFAULTS)
  })

  it('fills in missing fields with defaults', () => {
    const data = normalize({ progress: progressOf('solved', 'Two Sum'), plans: {}, reviews: {} })
    expect(data).toEqual({ ...DEFAULTS, progress: progressOf('solved', 'Two Sum') })
  })

  it("drops v2's single daily goal in favour of weekday/weekend goals", () => {
    const data = normalize({ progress: {}, plans: {}, reviews: {}, dailyGoal: 5 })
    expect(data).not.toHaveProperty('dailyGoal')
    expect([data.weekdayGoal, data.weekendGoal, data.weeklyDays]).toEqual([1, 3, 4])
  })

  it('starts a review schedule for problems solved in v1, which had none', () => {
    const progress = {
      [idOf('Two Sum')]: { status: 'solved', updatedAt: new Date(2026, 9, 20, 12).toISOString() },
      [idOf('Valid Anagram')]: { status: 'helped', updatedAt: new Date(2026, 9, 20, 12).toISOString() },
      [idOf('Min Stack')]: { status: 'attempted', updatedAt: new Date(2026, 9, 20, 12).toISOString() },
    }
    expect(normalize({ progress, plans: {} }).reviews).toEqual({
      [idOf('Two Sum')]: { step: 0, due: '2026-10-23' },
      [idOf('Valid Anagram')]: { step: -1, due: '2026-10-21' },
    })
  })

  it('keeps valid entries and drops broken ones, field by field', () => {
    const good = attempt('Two Sum', '2026-10-20')
    const data = normalize({
      progress: {
        ...progressOf('solved', 'Two Sum'),
        [idOf('Min Stack')]: { status: 'done', updatedAt: '2026-10-01T00:00:00Z' },
        [idOf('Valid Anagram')]: { status: 'solved', updatedAt: 'yesterday' },
        notAnId: { status: 'solved', updatedAt: '2026-10-01T00:00:00Z' },
      },
      plans: {
        '2026-10-20': [{ id: idOf('Two Sum'), done: true, attempt: good.key }, { id: 'x', done: false }, null],
        'not-a-day': [{ id: 1, done: false }],
      },
      attempts: [good, { ...good, key: 'bad', result: 'great' }, { ...good, key: 'bad2', seconds: -5 }, 'nope'],
      studies: [{ key: 's', id: idOf('Car Fleet'), date: '2026-10-21', at: 'x' }, { key: 's2', id: 1 }],
      reviews: { [idOf('Two Sum')]: { step: 0, due: '2026-10-23' }, [idOf('Min Stack')]: { step: 'one', due: null } },
      notes: { [idOf('Two Sum')]: 'hash map of seen values', [idOf('Min Stack')]: 42 },
      complexity: { [idOf('Two Sum')]: { time: 'O(n)', space: 'O(n)' }, [idOf('Min Stack')]: { time: 'O(1)' } },
    })
    expect(Object.keys(data.progress)).toEqual([String(idOf('Two Sum'))])
    expect(data.plans).toEqual({ '2026-10-20': [{ id: idOf('Two Sum'), done: true, attempt: good.key }] })
    expect(data.attempts).toEqual([good])
    expect(data.studies.map((s) => s.key)).toEqual(['s'])
    expect(Object.keys(data.reviews)).toEqual([String(idOf('Two Sum'))])
    expect(data.notes).toEqual({ [idOf('Two Sum')]: 'hash map of seen values' })
    expect(data.complexity).toEqual({ [idOf('Two Sum')]: { time: 'O(n)', space: 'O(n)' } })
  })

  it('survives a field of the wrong type — the crash this guards against', () => {
    const data = normalize({ progress: {}, plans: {}, attempts: {}, studies: 'none', reviews: [], notes: null })
    expect(data.attempts).toEqual([])
    expect(data.studies).toEqual([])
    expect(data.reviews).toEqual({})
    expect(data.notes).toEqual({})
  })

  it('clamps goals into range and rejects non-integers', () => {
    const data = normalize({ weekdayGoal: 50, weekendGoal: 0, weeklyDays: 2.5 })
    expect([data.weekdayGoal, data.weekendGoal, data.weeklyDays]).toEqual([10, 1, 4])
  })

  it('validates the interview target, timer and settings', () => {
    const valid = normalize({
      interview: { date: '2026-12-01', setOn: '2026-10-25', solvedAtSet: 10 },
      timer: { id: idOf('Two Sum'), startedAt: null, elapsed: 60_000 },
      coreFirst: false,
      comebackAt: '2026-10-20',
    })
    expect(valid.interview).toEqual({ date: '2026-12-01', setOn: '2026-10-25', solvedAtSet: 10 })
    expect(valid.timer).toEqual({ id: idOf('Two Sum'), startedAt: null, elapsed: 60_000 })
    expect([valid.coreFirst, valid.comebackAt]).toEqual([false, '2026-10-20'])

    const invalid = normalize({ interview: { date: 'soon' }, timer: { id: 1 }, coreFirst: 'yes', comebackAt: 3 })
    expect([invalid.interview, invalid.timer, invalid.coreFirst, invalid.comebackAt]).toEqual([null, null, true, null])
  })

  it('is stable: normalizing a backup of normalized data changes nothing', () => {
    const data = normalize({
      progress: progressOf('solved', 'Two Sum'),
      plans: { '2026-10-20': [{ id: idOf('Two Sum'), done: false }] },
      attempts: [attempt('Two Sum', '2026-10-20')],
      reviews: { [idOf('Two Sum')]: { step: 0, due: '2026-10-23' } },
    })
    expect(normalize(JSON.parse(JSON.stringify(exportable(data))))).toEqual(data)
  })
})

describe('exportable', () => {
  it('leaves out the running timer', () => {
    const data = { ...DEFAULTS, timer: { id: 1, startedAt: 0, elapsed: 0 } }
    expect(exportable(data)).not.toHaveProperty('timer')
  })
})

describe('isTrackerData', () => {
  it('accepts anything shaped like a backup', () => {
    expect(isTrackerData({ progress: {}, plans: {} })).toBe(true)
  })

  it('rejects other JSON', () => {
    for (const value of [null, [], 'x', { progress: {} }, { progress: [], plans: {} }, { progress: {}, plans: null }]) {
      expect(isTrackerData(value)).toBe(false)
    }
  })
})
