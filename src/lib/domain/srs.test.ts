import { describe, expect, it } from 'vitest'
import { REVIEW_INTERVALS } from '@/lib/_consts/practice'
import type { ReviewState } from '@/types'
import { initialReview, isDue, nextReview, spreadOverdue, spreadSchedule } from './srs'

const today = '2026-10-25'

describe('nextReview', () => {
  it('walks a clean solve through 3 → 7 → 21 → 60 days, then marks it mastered', () => {
    let review = nextReview(undefined, 'solved', 2, today)
    expect(review).toEqual({ step: 0, due: '2026-10-28' })
    const dues = [review.due]
    for (let i = 1; i < REVIEW_INTERVALS.length; i++) {
      review = nextReview(review, 'solved', 3, today)
      dues.push(review.due)
    }
    expect(dues).toEqual(['2026-10-28', '2026-11-01', '2026-11-15', '2026-12-24'])
    expect(nextReview(review, 'solved', 2, today)).toEqual({ step: REVIEW_INTERVALS.length, due: null })
  })

  it('repeats the same interval after a shaky solve', () => {
    expect(nextReview({ step: 2, due: today }, 'solved', 1, today)).toEqual({ step: 2, due: '2026-11-15' })
    expect(nextReview(undefined, 'solved', 1, today)).toEqual({ step: 0, due: '2026-10-28' })
  })

  it('brings a problem back tomorrow after needing help or failing', () => {
    expect(nextReview({ step: 3, due: today }, 'helped', 3, today)).toEqual({ step: -1, due: '2026-10-26' })
    expect(nextReview(undefined, 'failed', 1, today)).toEqual({ step: -1, due: '2026-10-26' })
  })

  it('restarts the ladder after relearning', () => {
    const relearning: ReviewState = { step: -1, due: today }
    expect(nextReview(relearning, 'solved', 2, today)).toEqual({ step: 0, due: '2026-10-28' })
    expect(nextReview(relearning, 'solved', 1, today)).toEqual({ step: 0, due: '2026-10-28' })
  })
})

describe('initialReview', () => {
  it('schedules a hand-marked solve like a first clean solve', () => {
    expect(initialReview('solved', today)).toEqual({ step: 0, due: '2026-10-28' })
  })

  it('brings a solve-with-help back tomorrow', () => {
    expect(initialReview('helped', today)).toEqual({ step: -1, due: '2026-10-26' })
  })
})

describe('isDue', () => {
  it('is due on or after the due date', () => {
    expect(isDue({ step: 0, due: today }, today)).toBe(true)
    expect(isDue({ step: 0, due: '2026-10-01' }, today)).toBe(true)
    expect(isDue({ step: 0, due: '2026-10-26' }, today)).toBe(false)
  })

  it('is never due when mastered or unscheduled', () => {
    expect(isDue({ step: 4, due: null }, today)).toBe(false)
    expect(isDue(undefined, today)).toBe(false)
  })
})

describe('spreadSchedule', () => {
  it('spreads up to 14 overdue reviews one a day, over two weeks', () => {
    expect(spreadSchedule(0)).toEqual({ perDay: 1, days: 14 })
    expect(spreadSchedule(14)).toEqual({ perDay: 1, days: 14 })
  })

  it('never asks for more than two a day', () => {
    expect(spreadSchedule(15)).toEqual({ perDay: 2, days: 14 })
    expect(spreadSchedule(40)).toEqual({ perDay: 2, days: 20 })
  })
})

describe('spreadOverdue', () => {
  it('reschedules overdue reviews from tomorrow, oldest first, keeping their place on the ladder', () => {
    const reviews: Record<number, ReviewState> = {
      1: { step: 2, due: '2026-10-20' },
      2: { step: 0, due: '2026-10-01' },
      3: { step: 1, due: '2026-10-25' },
      4: { step: 1, due: '2026-11-03' },
      5: { step: 4, due: null },
    }
    expect(spreadOverdue(reviews, today)).toEqual({
      2: { step: 0, due: '2026-10-26' },
      1: { step: 2, due: '2026-10-27' },
      3: { step: 1, due: '2026-10-28' },
      4: { step: 1, due: '2026-11-03' },
      5: { step: 4, due: null },
    })
  })

  it('puts two on a day once the backlog is bigger than two weeks', () => {
    const reviews: Record<number, ReviewState> = {}
    for (let id = 1; id <= 16; id++) reviews[id] = { step: 0, due: overdueDate(id) }
    const spread = spreadOverdue(reviews, today)
    const perDay = new Map<string, number>()
    for (const r of Object.values(spread)) perDay.set(r.due!, (perDay.get(r.due!) ?? 0) + 1)
    expect([...perDay.values()]).toEqual([2, 2, 2, 2, 2, 2, 2, 2])
    expect([...perDay.keys()].sort()[0]).toBe('2026-10-26')
  })

  it('leaves everything alone when nothing is overdue', () => {
    const reviews = { 1: { step: 0, due: '2026-10-30' } }
    expect(spreadOverdue(reviews, today)).toEqual(reviews)
  })
})

/** A distinct overdue date per id: Oct 24, Oct 23, … */
function overdueDate(id: number) {
  return `2026-10-${String(25 - id).padStart(2, '0')}`
}
