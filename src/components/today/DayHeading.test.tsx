import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { dayOrder } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import type { PlanItem, TimerState } from '@/types'
import { DayHeading } from './DayHeading'

const today = '2026-10-26' // a Monday
const [twoSum, mergeK, lru] = ['Two Sum', 'Merge K Sorted Lists', 'LRU Cache'].map(idOf)

function renderHeading(plan: PlanItem[], { goal = 2, timer = null }: { goal?: number; timer?: TimerState | null } = {}) {
  resetStores({ plans: { [today]: plan }, weekdayGoal: goal, timer })
  render(<DayHeading today={today} plan={plan} goal={goal} order={dayOrder(plan, goal, timer?.id ?? null)} />)
}

describe('DayHeading', () => {
  it('names the day', () => {
    renderHeading([])
    expect(screen.getByRole('heading', { level: 1, name: 'Monday, October 26' })).toBeInTheDocument()
  })

  it('shows progress toward the goal and the time it still needs', () => {
    renderHeading([{ id: twoSum, done: true }, { id: mergeK, done: false }, { id: lru, done: false }])
    expect(screen.getByText(/of 2 done/)).toBeInTheDocument()
    // One more is needed: Merge K Sorted Lists, a 40-minute Hard. LRU Cache is bonus.
    expect(screen.getByText('· about 40 min to go')).toBeInTheDocument()
  })

  it('counts down with the clock on the problem being worked on', () => {
    renderHeading([{ id: mergeK, done: false }], { goal: 1, timer: { id: mergeK, startedAt: null, elapsed: 14 * 60_000 } })
    expect(screen.getByText('· about 26 min to go')).toBeInTheDocument()
  })

  it('stops counting once the goal is met', () => {
    renderHeading([{ id: twoSum, done: true }, { id: lru, done: false }], { goal: 1 })
    expect(screen.getByText('Daily goal done')).toBeInTheDocument()
    expect(screen.queryByText(/min to go/)).not.toBeInTheDocument()
  })

  it('suggests one more problem', async () => {
    const user = userEvent.setup()
    renderHeading([{ id: twoSum, done: true }, { id: lru, done: false }])
    await user.click(screen.getByRole('button', { name: 'Suggest 1 more' }))
    expect(useTracker.getState().plans[today]).toHaveLength(3)
  })
})
