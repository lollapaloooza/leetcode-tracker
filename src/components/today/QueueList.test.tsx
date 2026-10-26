import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { dayOrder } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import type { PlanItem } from '@/types'
import { sortableId } from './board-lists'
import { QueueList } from './QueueList'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn(), prefersMotion: () => false }))

const today = '2026-10-26'
const [twoSum, lru, mergeK] = ['Two Sum', 'LRU Cache', 'Merge K Sorted Lists'].map(idOf)

function renderQueue(plan: PlanItem[], timerId: number | null = null) {
  resetStores({ plans: { [today]: plan }, weekdayGoal: 1, timer: timerId === null ? null : { id: timerId, startedAt: null, elapsed: 0 } })
  const order = dayOrder(plan, 1, timerId)
  render(
    <DndContext>
      <QueueList today={today} plan={plan} order={order} ids={order.queue.map((id) => sortableId('today', id))} />
    </DndContext>,
  )
}

describe('QueueList', () => {
  it('keeps each row to one line: Start and ✕, no links', () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }])
    const row = screen.getByRole('button', { name: 'Two Sum' }).closest('li')!
    expect(within(row).getByRole('button', { name: 'Start Two Sum' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Remove Two Sum from today' })).toBeInTheDocument()
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
    expect(row).toHaveTextContent('Arrays & Hashing · New')
  })

  it('sets a problem aside in the backlog, and Undo puts it back in its place', async () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }, { id: mergeK, done: false }])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Two Sum from today' }))
    expect(useTracker.getState().plans[today].map((p) => p.id)).toEqual([lru, mergeK])
    expect(useTracker.getState().backlog).toEqual([twoSum])

    useUI.getState().toast!.action!.run()
    expect(useTracker.getState().plans[today].map((p) => p.id)).toEqual([lru, twoSum, mergeK])
    expect(useTracker.getState().backlog).toEqual([])
  })

  it('offers no Start while another problem is being timed', () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }], lru)
    expect(screen.queryByRole('button', { name: 'Start Two Sum' })).not.toBeInTheDocument()
  })
})
