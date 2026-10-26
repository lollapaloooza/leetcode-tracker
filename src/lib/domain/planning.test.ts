import { describe, expect, it } from 'vitest'
import { PROBLEMS } from '@/data/problems'
import { attempt, idOf, progressOf, tracker } from '@/test/builders'
import type { PlanItem } from '@/types'
import {
  dueReviews,
  goalFor,
  lastTouched,
  nextInTopic,
  nextToStudy,
  plannedFrom,
  problemOrder,
  quickReview,
  restartPick,
  solvedCount,
  suggestionCount,
  suggestNext,
} from './planning'

const today = '2026-10-25' // a Sunday
const plan = (...titles: string[]): PlanItem[] => titles.map((t) => ({ id: idOf(t), done: false }))
const titles = (ids: (number | null)[]) => ids.map((id) => PROBLEMS.find((p) => p.id === id)?.title ?? null)

describe('problemOrder', () => {
  it('pulls the core NeetCode 150 ahead of the other 100', () => {
    const order = problemOrder(true)
    expect(order).toHaveLength(PROBLEMS.length)
    expect(order.slice(0, 150).every((p) => p.core)).toBe(true)
    expect(order.slice(150).some((p) => p.core)).toBe(false)
  })

  it('is plain NeetCode 250 order otherwise', () => {
    expect(problemOrder(false)).toEqual(PROBLEMS)
  })
})

describe('goals', () => {
  it('uses the weekend goal on Saturday and Sunday', () => {
    const s = tracker({ weekdayGoal: 1, weekendGoal: 3 })
    expect(goalFor(s, '2026-10-26')).toBe(1)
    expect(goalFor(s, today)).toBe(3)
  })

  it('suggests enough to reach the goal, and always at least one more', () => {
    const s = tracker({ weekendGoal: 3, plans: { [today]: plan('Two Sum') } })
    expect(suggestionCount(s, today)).toBe(2)
    expect(suggestionCount(tracker({ plans: { [today]: plan('Two Sum', 'Valid Anagram', 'Min Stack') } }), today)).toBe(1)
  })
})

describe('solvedCount', () => {
  it('counts solved and solved-with-help, not attempts', () => {
    const progress = {
      ...progressOf('solved', 'Two Sum'),
      ...progressOf('helped', 'Valid Anagram'),
      ...progressOf('attempted', 'Min Stack'),
    }
    expect(solvedCount(progress)).toBe(2)
  })
})

describe('plannedFrom', () => {
  it('collects plans from a date on, leaving the past out', () => {
    const plans = {
      '2026-10-24': plan('Two Sum'),
      [today]: plan('Valid Anagram'),
      '2026-10-31': plan('Trapping Rain Water'),
    }
    expect(titles(plannedFrom(plans, today).map((p) => p.id))).toEqual(['Valid Anagram', 'Trapping Rain Water'])
  })
})

describe('dueReviews', () => {
  it('lists due reviews oldest first, skipping future and mastered ones', () => {
    const reviews = {
      [idOf('Two Sum')]: { step: 0, due: '2026-10-24' },
      [idOf('Valid Anagram')]: { step: 1, due: '2026-10-10' },
      [idOf('Min Stack')]: { step: 0, due: '2026-10-26' },
      [idOf('Binary Search')]: { step: 4, due: null },
    }
    expect(titles(dueReviews(reviews, today))).toEqual(['Valid Anagram', 'Two Sum'])
  })
})

describe('suggestNext', () => {
  const s = tracker({
    progress: progressOf('solved', 'Contains Duplicate', 'Valid Anagram', 'Two Sum'),
    reviews: {
      [idOf('Two Sum')]: { step: 0, due: '2026-10-20' },
      [idOf('Valid Anagram')]: { step: 0, due: '2026-10-24' },
    },
  })

  it('puts due reviews first, then the next unsolved problems in core-first order', () => {
    expect(titles(suggestNext(s, [], 4, today))).toEqual(['Two Sum', 'Valid Anagram', 'Group Anagrams', 'Top K Frequent Elements'])
  })

  it('skips anything already planned', () => {
    expect(titles(suggestNext(s, plan('Group Anagrams', 'Two Sum'), 3, today))).toEqual([
      'Valid Anagram',
      'Top K Frequent Elements',
      'Encode and Decode Strings',
    ])
  })

  it('leaves alone what you set aside in the backlog', () => {
    const backlogged = { ...s, backlog: [idOf('Two Sum'), idOf('Group Anagrams')] }
    expect(titles(suggestNext(backlogged, [], 3, today))).toEqual(['Valid Anagram', 'Top K Frequent Elements', 'Encode and Decode Strings'])
  })

  it('takes the oldest due review when it may only pick one', () => {
    expect(titles(suggestNext(s, [], 1, today))).toEqual(['Two Sum'])
  })

  it('follows plain NeetCode order when core-first is off', () => {
    expect(titles(suggestNext(tracker({ coreFirst: false }), [], 1, today))).toEqual(['Concatenation of Array'])
    expect(titles(suggestNext(tracker({ coreFirst: true }), [], 1, today))).toEqual(['Contains Duplicate'])
  })
})

describe('nextInTopic', () => {
  const tries = ['Implement Trie Prefix Tree', 'Design Add And Search Words Data Structure', 'Word Search II', 'Extra Characters in a String']

  it('picks the next unsolved problem in the topic, skipping planned ones', () => {
    const s = tracker({ progress: progressOf('solved', tries[0], tries[1]) })
    expect(titles([nextInTopic(s, 'Tries', [], today)])).toEqual(['Word Search II'])
    expect(titles([nextInTopic(s, 'Tries', plan('Word Search II'), today)])).toEqual(['Extra Characters in a String'])
  })

  it('falls back to a due review once the topic is all solved', () => {
    const s = tracker({ progress: progressOf('solved', ...tries), reviews: { [idOf('Word Search II')]: { step: 1, due: today } } })
    expect(titles([nextInTopic(s, 'Tries', [], today)])).toEqual(['Word Search II'])
  })

  it('then to the problem touched longest ago', () => {
    const s = tracker({
      progress: progressOf('solved', ...tries),
      attempts: [
        attempt(tries[0], '2026-10-20'),
        attempt(tries[1], '2026-10-10'),
        attempt(tries[2], '2026-10-15'),
        attempt(tries[3], '2026-10-22'),
      ],
    })
    expect(titles([nextInTopic(s, 'Tries', [], today)])).toEqual([tries[1]])
  })
})

describe('quickReview', () => {
  const due = (title: string, date: string) => ({ [idOf(title)]: { step: 0, due: date } })

  it('picks the easiest due review, never a Hard', () => {
    const s = tracker({
      reviews: { ...due('Trapping Rain Water', '2026-10-01'), ...due('Top K Frequent Elements', '2026-10-02'), ...due('Two Sum', '2026-10-20') },
    })
    expect(quickReview(s, today)).toEqual({ id: idOf('Two Sum'), reason: 'Due for review' })
    const planned = { ...s, plans: { [today]: plan('Two Sum') } }
    expect(quickReview(planned, today)).toEqual({ id: idOf('Top K Frequent Elements'), reason: 'Due for review' })
  })

  it('otherwise re-solves the Easy you solved on your own longest ago', () => {
    const s = tracker({
      progress: { ...progressOf('solved', 'Two Sum', 'Valid Anagram'), ...progressOf('helped', 'Contains Duplicate') },
      attempts: [attempt('Valid Anagram', '2026-10-10'), attempt('Two Sum', '2026-10-20'), attempt('Contains Duplicate', '2026-09-01')],
    })
    expect(quickReview(s, today)).toEqual({ id: idOf('Valid Anagram'), reason: 'Quick re-solve of an Easy you know' })
  })

  it('has nothing to offer before anything is solved', () => {
    expect(quickReview(tracker(), today)).toBeNull()
  })
})

describe('nextToStudy', () => {
  it("skips what's solved, studied, or already planned for today or tomorrow", () => {
    const s = tracker({
      progress: progressOf('solved', 'Contains Duplicate'),
      studies: [{ key: 's1', id: idOf('Valid Anagram'), date: '2026-10-20', at: '2026-10-20T20:00:00.000Z' }],
      plans: { [today]: plan('Two Sum'), '2026-10-26': plan('Group Anagrams') },
    })
    expect(titles([nextToStudy(s, today)])).toEqual(['Top K Frequent Elements'])
  })
})

describe('restartPick', () => {
  it('prefers an Easy you solved on your own, touched longest ago (never-attempted first)', () => {
    const progress = progressOf('solved', 'Two Sum', 'Valid Anagram')
    const attempts = [attempt('Two Sum', '2026-10-20'), attempt('Valid Anagram', '2026-10-10')]
    expect(titles([restartPick(tracker({ progress, attempts }))])).toEqual(['Valid Anagram'])
    const withUntouched = { ...progress, ...progressOf('solved', 'Binary Search') }
    expect(titles([restartPick(tracker({ progress: withUntouched, attempts }))])).toEqual(['Binary Search'])
  })

  it("doesn't count solves that needed help", () => {
    expect(titles([restartPick(tracker({ progress: progressOf('helped', 'Two Sum') }))])).toEqual(['Contains Duplicate'])
  })

  it('falls back to the first unsolved Easy', () => {
    expect(titles([restartPick(tracker({ coreFirst: true }))])).toEqual(['Contains Duplicate'])
    expect(titles([restartPick(tracker({ coreFirst: false }))])).toEqual(['Concatenation of Array'])
  })
})

describe('lastTouched', () => {
  it("is the latest attempt's day, or empty if never attempted", () => {
    const attempts = [attempt('Two Sum', '2026-10-01'), attempt('Two Sum', '2026-10-20'), attempt('Min Stack', '2026-10-05')]
    expect(lastTouched(attempts, idOf('Two Sum'))).toBe('2026-10-20')
    expect(lastTouched(attempts, idOf('Binary Search'))).toBe('')
  })
})
