import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { openInNewTab } from '@/lib/_utils/browser'
import { dayOrder } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import type { PlanItem } from '@/types'
import { sortableId } from './board-lists'
import { QueueList } from './QueueList'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn() }))

const today = '2026-10-26'
const [twoSum, lru] = ['Two Sum', 'LRU Cache'].map(idOf)

function renderQueue(plan: PlanItem[], timerId: number | null = null) {
  resetStores({ plans: { [today]: plan }, weekdayGoal: 1, timer: timerId === null ? null : { id: timerId, startedAt: null, elapsed: 0 } })
  const order = dayOrder(plan, 1, timerId)
  render(
    <DndContext>
      <QueueList today={today} plan={plan} order={order} ids={order.queue.map((id) => sortableId('today', id))} />
    </DndContext>,
  )
}
const openMenu = async (title: string) => {
  await userEvent.setup().click(screen.getByRole('button', { name: `More actions for ${title}` }))
  return screen.findByRole('menu')
}

describe('QueueList', () => {
  beforeAll(() => vi.mocked(openInNewTab).mockClear())

  it('keeps each row to one line: no link buttons, just Start and ⋯', () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }])
    const row = screen.getByRole('button', { name: 'Two Sum' }).closest('li')!
    expect(within(row).getByRole('button', { name: 'Start Two Sum' })).toBeInTheDocument()
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
    expect(row).toHaveTextContent('Arrays & Hashing · New')
  })

  it("puts the problem's links, and everything else, in ⋯", async () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }])
    const menu = await openMenu('Two Sum')
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Start',
      'Do first',
      'Move to tomorrow',
      'Move to Saturday',
      'Open on LeetCode',
      'Open on NeetCode',
      'Watch solution video',
      'Remove from today',
    ])

    await userEvent.setup().click(within(menu).getByRole('menuitem', { name: 'Open on LeetCode' }))
    expect(openInNewTab).toHaveBeenCalledWith('https://leetcode.com/problems/two-sum/')
  })

  it('"Do first" makes a problem the one up next', async () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }])
    await userEvent.setup().click(within(await openMenu('Two Sum')).getByRole('menuitem', { name: 'Do first' }))
    expect(useTracker.getState().plans[today].map((p) => p.id)).toEqual([twoSum, lru])
  })

  it('offers no Start while another problem is being timed', async () => {
    renderQueue([{ id: lru, done: false }, { id: twoSum, done: false }], lru)
    expect(screen.queryByRole('button', { name: 'Start Two Sum' })).not.toBeInTheDocument()
    expect(within(await openMenu('Two Sum')).queryByRole('menuitem', { name: 'Start' })).not.toBeInTheDocument()
  })
})
