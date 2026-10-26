import { beforeEach, describe, expect, it } from 'vitest'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { idOf } from '@/test/builders'
import type { TrackerData } from '@/types'
import { useTracker } from './tracker-store'

const today = '2026-10-26'
const tomorrow = '2026-10-27'
const [twoSum, lru, anagrams] = ['Two Sum', 'LRU Cache', 'Group Anagrams'].map(idOf)
const store = () => useTracker.getState()
const reset = (data: Partial<TrackerData> = {}) => useTracker.setState({ ...TRACKER_DEFAULTS, ...data })

describe('the backlog', () => {
  beforeEach(() => reset())

  it('keeps an unfinished problem taken off a plan, newest first', () => {
    reset({ plans: { [today]: [{ id: twoSum, done: false }], [tomorrow]: [{ id: lru, done: false }] }, backlog: [anagrams] })
    store().removeFromPlan(twoSum, today)
    store().removeFromPlan(lru, tomorrow)
    expect(store().plans).toEqual({ [today]: [], [tomorrow]: [] })
    expect(store().backlog).toEqual([lru, twoSum, anagrams])
  })

  it("doesn't keep a finished one, and stops a timer on the removed problem", () => {
    reset({ plans: { [today]: [{ id: twoSum, done: true }, { id: lru, done: false }] }, timer: { id: lru, startedAt: null, elapsed: 5000 } })
    store().removeFromPlan(twoSum, today)
    store().removeFromPlan(lru, today)
    expect(store().backlog).toEqual([lru])
    expect(store().timer).toBeNull()
  })

  it('puts a removed problem back where it was', () => {
    reset({ plans: { [today]: [{ id: twoSum, done: false }, { id: lru, done: false }, { id: anagrams, done: false }] } })
    store().removeFromPlan(lru, today)
    store().putBack(lru, today, 1)
    expect(store().plans[today].map((p) => p.id)).toEqual([twoSum, lru, anagrams])
    expect(store().backlog).toEqual([])
  })

  it('lets go of a problem once it is planned, started or logged again', () => {
    reset({ backlog: [twoSum, lru, anagrams] })
    store().addToPlan([twoSum], tomorrow)
    store().startTimer(lru, today)
    store().logAttempt(anagrams, { seconds: 600, result: 'solved', confidence: 3, note: '', time: '', space: '' }, today)
    expect(store().backlog).toEqual([])
  })

  it('forgets a problem, and takes it back at the same place', () => {
    reset({ backlog: [twoSum, lru, anagrams] })
    store().removeFromBacklog(lru)
    expect(store().backlog).toEqual([twoSum, anagrams])
    store().addToBacklog(lru, 1)
    expect(store().backlog).toEqual([twoSum, lru, anagrams])
  })

  it('is skipped by Suggest', () => {
    reset({ backlog: [idOf('Contains Duplicate')] })
    store().suggestForDay(today, today)
    expect(store().plans[today].map((p) => p.id)).toEqual([idOf('Valid Anagram')])
  })
})

describe('restoreTimer', () => {
  it('brings a stopped timer back, unless another one started since', () => {
    reset()
    store().restoreTimer({ id: twoSum, startedAt: null, elapsed: 60_000 })
    expect(store().timer).toEqual({ id: twoSum, startedAt: null, elapsed: 60_000 })
    store().restoreTimer({ id: lru, startedAt: null, elapsed: 0 })
    expect(store().timer?.id).toBe(twoSum)
  })
})
