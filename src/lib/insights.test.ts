import { describe, expect, it } from 'vitest'
import { problemById } from '@/data/problems'
import { activityByDay, computePace, currentWeek, lastActiveBefore, lastWeekSummary, weakTopics, weeklyStreak } from './insights'
import { attempt, idOf } from './test-utils'

describe('computePace', () => {
  const target = { date: '2026-11-24', setOn: '2026-10-25', solvedAtSet: 50 }

  it('starts on track the day the target is set', () => {
    expect(computePace(target, 50, 250, '2026-10-25')).toEqual({ daysLeft: 30, perDay: 7, expected: 50, delta: 0 })
  })

  it('measures where a steady pace would be by now', () => {
    // 10 of 30 days in: a straight line from 50 to 250 is at 116.
    expect(computePace(target, 100, 250, '2026-11-04')).toEqual({ daysLeft: 20, perDay: 8, expected: 116, delta: -16 })
  })

  it('asks for everything left once the date has passed', () => {
    expect(computePace(target, 200, 250, '2026-11-30')).toEqual({ daysLeft: -6, perDay: 50, expected: 250, delta: -50 })
  })
})

describe('activityByDay', () => {
  it('counts attempts, study sessions, and problems checked off without a log', () => {
    const solvedTwoSum = attempt('Two Sum', '2026-10-20')
    const activity = activityByDay(
      [solvedTwoSum, attempt('Valid Anagram', '2026-10-20')],
      {
        '2026-10-20': [{ id: idOf('Two Sum'), done: true, attempt: solvedTwoSum.key }],
        '2026-10-22': [
          { id: idOf('Min Stack'), done: true },
          { id: idOf('Valid Parentheses'), done: false },
        ],
      },
      [{ key: 's1', id: idOf('Car Fleet'), date: '2026-10-21', at: '2026-10-21T20:00:00.000Z' }],
    )
    expect(Object.fromEntries(activity)).toEqual({ '2026-10-20': 2, '2026-10-21': 1, '2026-10-22': 1 })
  })
})

describe('lastActiveBefore', () => {
  it('finds the most recent active day before today', () => {
    expect(lastActiveBefore(['2026-10-01', '2026-10-20', '2026-10-25'], '2026-10-25')).toBe('2026-10-20')
  })

  it('is null without earlier activity', () => {
    expect(lastActiveBefore(['2026-10-25'], '2026-10-25')).toBeNull()
  })
})

describe('currentWeek', () => {
  it('lays out Monday to Sunday with active, today and future flags', () => {
    const week = currentWeek(new Set(['2026-10-26', '2026-10-28']), '2026-10-28')
    expect(week.map((d) => d.date)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
    expect(week.map((d) => d.active)).toEqual([true, false, true, false, false, false, false])
    expect(week.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false])
    expect(week.map((d) => d.future)).toEqual([false, false, false, true, true, true, true])
  })
})

describe('weeklyStreak', () => {
  const pastWeeks = ['2026-10-20', '2026-10-24', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-05']

  it('keeps the streak through last week while this week is still in progress', () => {
    const active = new Set([...pastWeeks, '2026-10-26'])
    expect(weeklyStreak(active, '2026-10-28', 2)).toEqual({ weeks: 2, thisWeek: 1 })
  })

  it('adds this week once its goal is hit', () => {
    const active = new Set([...pastWeeks, '2026-10-26', '2026-10-27'])
    expect(weeklyStreak(active, '2026-10-28', 2)).toEqual({ weeks: 3, thisWeek: 2 })
  })

  it('is zero after a week that missed the goal', () => {
    expect(weeklyStreak(new Set(['2026-10-05']), '2026-10-28', 1)).toEqual({ weeks: 0, thisWeek: 0 })
  })
})

describe('lastWeekSummary', () => {
  it('summarizes the last 7 days against the 7 before', () => {
    const attempts = [
      attempt('Two Sum', '2026-10-25', { seconds: 20 * 60 }), // over the 15-minute Easy target
      attempt('Top K Frequent Elements', '2026-10-24', { prev: { status: 'solved', planned: true, done: false } }),
      attempt('Valid Parentheses', '2026-10-20', { seconds: null }),
      attempt('Min Stack', '2026-10-15'),
      attempt('Binary Search', '2026-10-10'),
    ]
    expect(lastWeekSummary(attempts, problemById, '2026-10-25')).toEqual({
      attempts: 3,
      fresh: 2,
      reviews: 1,
      medianMinutes: 15,
      overTarget: 1,
      activeDays: 3,
      previousAttempts: 1,
    })
  })
})

describe('weakTopics', () => {
  it('ranks struggling over running slow over shaky, and skips topics it cannot judge', () => {
    const attempts = [
      // Stack: one of two failed
      attempt('Valid Parentheses', '2026-10-20', { result: 'failed' }),
      attempt('Min Stack', '2026-10-21'),
      // Two Pointers: one of two over the 40-minute Hard target
      attempt('Trapping Rain Water', '2026-10-15', { seconds: 50 * 60 }),
      attempt('Trapping Rain Water', '2026-10-22', { seconds: 30 * 60 }),
      // Arrays & Hashing: one shaky solve (old failures are outside the 60-day window)
      attempt('Two Sum', '2026-10-18', { confidence: 1 }),
      attempt('Valid Anagram', '2026-10-19', { confidence: 3 }),
      attempt('Group Anagrams', '2026-08-01', { result: 'failed' }),
      attempt('Group Anagrams', '2026-08-02', { result: 'failed' }),
      // Binary Search: all clean — not a weak spot
      attempt('Binary Search', '2026-10-10'),
      attempt('Binary Search', '2026-10-11'),
      // Tries: a single attempt is too few to judge
      attempt('Implement Trie Prefix Tree', '2026-10-12', { result: 'failed' }),
    ]
    const focus = weakTopics(attempts, problemById, '2026-10-25')
    expect(focus.map((f) => [f.topic, f.reason])).toEqual([
      ['Stack', '1 of 2 needed help or failed'],
      ['Two Pointers', '1 of 2 over time'],
      ['Arrays & Hashing', '1 shaky solve'],
    ])
  })

  it('returns at most `limit` topics', () => {
    const attempts = [
      attempt('Valid Parentheses', '2026-10-20', { result: 'failed' }),
      attempt('Min Stack', '2026-10-21', { result: 'failed' }),
      attempt('Two Sum', '2026-10-18', { result: 'helped' }),
      attempt('Valid Anagram', '2026-10-19'),
    ]
    expect(weakTopics(attempts, problemById, '2026-10-25', { limit: 1 }).map((f) => f.topic)).toEqual(['Stack'])
  })
})
