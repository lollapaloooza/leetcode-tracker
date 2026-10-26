import { describe, expect, it } from 'vitest'
import { idOf } from '@/test/builders'
import type { PlanItem } from '@/types'
import { dayOrder, laterPlans, leftovers, minutesLeft, reviewsThatFit } from './day'

const today = '2026-10-26'
const [easy, medium, hard, easy2] = ['Two Sum', 'LRU Cache', 'Merge K Sorted Lists', 'Valid Anagram'].map(idOf)
const item = (id: number, done = false): PlanItem => ({ id, done })

describe('dayOrder', () => {
  it('puts the first unfinished problem up next and queues the rest', () => {
    const order = dayOrder([item(easy, true), item(medium), item(hard)], 2, null)
    expect(order).toMatchObject({ done: [item(easy, true)], now: medium, timed: false, queue: [hard], needed: 1, goalMet: false })
  })

  it('spotlights the problem being timed, wherever it sits in the plan', () => {
    const order = dayOrder([item(easy), item(medium), item(hard)], 3, hard)
    expect(order).toMatchObject({ now: hard, timed: true, queue: [easy, medium] })
  })

  it('ignores a timer on a problem that is finished or not planned today', () => {
    expect(dayOrder([item(easy, true), item(medium)], 2, easy)).toMatchObject({ now: medium, timed: false })
    expect(dayOrder([item(medium)], 2, hard)).toMatchObject({ now: medium, timed: false })
  })

  // Three problems planned, the first `done` of them finished.
  it.each([
    { goal: 1, done: 0, bonusFrom: 0 },
    { goal: 2, done: 0, bonusFrom: 1 },
    { goal: 3, done: 0, bonusFrom: null },
    { goal: 2, done: 1, bonusFrom: 0 },
  ])('goal $goal with $done done: the bonus starts at queue index $bonusFrom', ({ goal, done, bonusFrom }) => {
    const plan = [easy, medium, hard].map((id, i) => item(id, i < done))
    expect(dayOrder(plan, goal, null).bonusFrom).toBe(bonusFrom)
  })

  it('has no bonus line once the goal is met — everything left is extra', () => {
    expect(dayOrder([item(easy, true), item(medium), item(hard)], 1, null)).toMatchObject({ goalMet: true, needed: 0, bonusFrom: null })
  })

  it('can leave the spotlight empty until a problem is started', () => {
    expect(dayOrder([item(easy), item(medium)], 2, null, false)).toMatchObject({ now: null, queue: [easy, medium], bonusFrom: null })
    expect(dayOrder([item(easy), item(medium)], 2, medium, false)).toMatchObject({ now: medium, timed: true, queue: [easy] })
  })

  it('has nothing up next when the plan is empty or finished', () => {
    expect(dayOrder([], 2, null)).toMatchObject({ now: null, queue: [], needed: 2 })
    expect(dayOrder([item(easy, true)], 1, null)).toMatchObject({ now: null, queue: [], goalMet: true })
  })
})

describe('minutesLeft', () => {
  const at = Date.UTC(2026, 9, 26, 23)

  it('adds up the time boxes the goal still needs', () => {
    // Medium 25 + Hard 40; the Easy after them is bonus.
    expect(minutesLeft(dayOrder([item(medium), item(hard), item(easy)], 2, null), null, at)).toBe(65)
  })

  it('takes off what the clock already has on the timed problem', () => {
    const order = dayOrder([item(hard), item(easy)], 2, hard)
    expect(minutesLeft(order, { id: hard, startedAt: at - 14 * 60_000, elapsed: 0 }, at)).toBe(26 + 15)
    expect(minutesLeft(order, { id: hard, startedAt: null, elapsed: 50 * 60_000 }, at)).toBe(15) // over time counts as 0
  })

  it('is 0 once the goal is met', () => {
    expect(minutesLeft(dayOrder([item(easy, true), item(hard)], 1, null), null, at)).toBe(0)
  })

  it('only counts what is planned, even when the goal needs more', () => {
    expect(minutesLeft(dayOrder([item(easy)], 3, null), null, at)).toBe(15)
  })
})

describe('reviewsThatFit', () => {
  it('adds as many due reviews as the goal has room for, and at least one', () => {
    expect(reviewsThatFit([easy, medium, hard], 0, 2)).toEqual([easy, medium])
    expect(reviewsThatFit([easy, medium, hard], 2, 2)).toEqual([easy])
    expect(reviewsThatFit([], 0, 2)).toEqual([])
  })
})

describe('leftovers', () => {
  it("offers yesterday's unfinished problems that aren't planned today", () => {
    const plans = { '2026-10-25': [item(easy), item(medium, true), item(hard)], [today]: [item(hard)] }
    expect(leftovers(plans, today)).toEqual({ date: '2026-10-25', ids: [easy] })
  })

  it('looks back two days at most, at the latest day with a plan', () => {
    expect(leftovers({ '2026-10-24': [item(easy)] }, today)).toEqual({ date: '2026-10-24', ids: [easy] })
    expect(leftovers({ '2026-10-23': [item(easy)] }, today)).toBeNull()
    expect(leftovers({ '2026-10-24': [item(easy)], '2026-10-25': [item(easy2, true)] }, today)).toBeNull()
  })
})

describe('laterPlans', () => {
  it('lists problems planned past tomorrow, soonest first', () => {
    const plans = { [today]: [item(easy)], '2026-10-27': [item(medium)], '2026-10-31': [item(hard)], '2026-10-29': [item(easy2)] }
    expect(laterPlans(plans, today)).toEqual([
      { day: '2026-10-29', id: easy2 },
      { day: '2026-10-31', id: hard },
    ])
  })
})
