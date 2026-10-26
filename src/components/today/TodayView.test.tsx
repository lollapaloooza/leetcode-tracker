import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { problemById } from '@/data/problems'
import { usePrefs, useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import type { PlanItem } from '@/types'
import { TodayView } from './TodayView'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn(), prefersMotion: () => false }))

const today = '2026-10-26' // a Monday
const [twoSum, mergeK, lru] = ['Two Sum', 'Merge K Sorted Lists', 'LRU Cache'].map(idOf)
const open = (id: number): PlanItem => ({ id, done: false })
const planToday = () => useTracker.getState().plans[today]?.map((p) => p.id)

function renderToday(plan: PlanItem[], extra: Parameters<typeof resetStores>[0] = {}) {
  resetStores({ plans: { [today]: plan }, weekdayGoal: 2, ...extra })
  render(<TodayView today={today} />)
}
const nowCard = () => screen.getByRole('region', { name: /Sorted Lists|Two Sum|LRU Cache/ })
const queue = () => screen.getByRole('list', { name: "Today's queue" })

describe('TodayView', () => {
  afterEach(() => vi.useRealTimers())

  it('starts from an empty day with a suggestion', async () => {
    const user = userEvent.setup()
    renderToday([])
    expect(screen.getByText('What are you solving today?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Suggest 2' }))
    expect(planToday()).toHaveLength(2)
    const first = problemById.get(planToday()![0])!.title
    expect(screen.getByRole('region', { name: first })).toHaveTextContent('Up next')
  })

  it('puts the first problem up next and queues the rest, with the goal line after the second', () => {
    renderToday([open(twoSum), open(mergeK), open(lru)])
    expect(nowCard()).toHaveAccessibleName('Two Sum')
    expect(screen.getByRole('heading', { name: 'Then 2' })).toBeInTheDocument()

    const rows = within(queue()).getAllByRole('listitem').map((li) => li.textContent)
    expect(rows[0]).toContain('Merge K Sorted Lists')
    expect(rows[1]).toContain('only if you still have energy')
    expect(rows[2]).toContain('LRU Cache')
  })

  it('moves a problem started from the queue into the spotlight', async () => {
    const user = userEvent.setup()
    renderToday([open(twoSum), open(mergeK), open(lru)])
    usePrefs.setState({ startOpens: 'nothing' })

    await user.click(within(queue()).getByRole('button', { name: 'Start LRU Cache' }))
    expect(nowCard()).toHaveAccessibleName('LRU Cache')
    expect(nowCard()).toHaveTextContent('Working on it')
    expect(within(queue()).getByText('Two Sum')).toBeInTheDocument()
  })

  it('offers due reviews that fit the goal, as a link', async () => {
    const user = userEvent.setup()
    const due = { step: 0, due: '2026-10-20' }
    renderToday([open(twoSum)], { reviews: { [mergeK]: due, [lru]: due } })

    // One problem planned, goal 2: room for one review.
    await user.click(screen.getByRole('button', { name: 'Add 1 to today' }))
    expect(planToday()).toHaveLength(2)
  })

  it("carries over yesterday's unfinished problems", async () => {
    const user = userEvent.setup()
    resetStores({ plans: { '2026-10-25': [open(lru)], [today]: [open(twoSum)] }, weekdayGoal: 2 })
    render(<TodayView today={today} />)

    expect(screen.getByText(/1 unfinished from/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Carry over' }))
    expect(planToday()).toEqual([twoSum, lru])
  })

  it('reorders the queue from the keyboard', async () => {
    const user = userEvent.setup()
    renderToday([open(twoSum), open(mergeK), open(lru)])

    within(queue()).getByRole('button', { name: 'Move Merge K Sorted Lists' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(planToday()).toEqual([twoSum, lru, mergeK])
  })

  it('picks a row up with a long press, so a quick touch still scrolls', () => {
    vi.useFakeTimers()
    renderToday([open(twoSum), open(mergeK), open(lru)])
    // Anywhere on the row: here, its title.
    const row = within(queue()).getByRole('button', { name: 'Merge K Sorted Lists' })
    const touch = { touches: [{ clientX: 40, clientY: 40 }] }
    const pickedUp = () => screen.getAllByText('Merge K Sorted Lists').length > 1 // the dragged copy follows the finger

    fireEvent.touchStart(row, touch)
    act(() => vi.advanceTimersByTime(100))
    expect(pickedUp()).toBe(false)
    fireEvent.touchEnd(row)

    fireEvent.touchStart(row, touch)
    act(() => vi.advanceTimersByTime(300))
    expect(pickedUp()).toBe(true)
    fireEvent.touchEnd(row)
    // dnd-kit swallows clicks until a moment after the drop; let that pass, or the next test's first click is lost.
    act(() => vi.runOnlyPendingTimers())
  })

  it('leaves the spotlight empty after you set its problem aside, until you choose the next', async () => {
    const user = userEvent.setup()
    renderToday([open(twoSum), open(mergeK)])

    await user.click(within(nowCard()).getByRole('button', { name: 'Remove Two Sum from today' }))
    expect(screen.queryByRole('region', { name: /Sorted Lists|Two Sum/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Nothing in focus/)).toBeInTheDocument()
    expect(within(queue()).getByRole('button', { name: 'Start Merge K Sorted Lists' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Or show the next one here' }))
    expect(nowCard()).toHaveAccessibleName('Merge K Sorted Lists')
  })

  it('keeps what you set aside in a backlog, ready to plan again', async () => {
    const user = userEvent.setup()
    renderToday([open(twoSum)], { backlog: [lru] })
    const backlog = screen.getByRole('list', { name: 'Backlog' })
    expect(backlog).toHaveTextContent('LRU Cache')

    await user.click(within(backlog).getByRole('button', { name: 'Add LRU Cache to today' }))
    expect(planToday()).toEqual([twoSum, lru])
    expect(screen.queryByRole('list', { name: 'Backlog' })).not.toBeInTheDocument()
  })

  it('forgets a backlog problem, with Undo', async () => {
    const user = userEvent.setup()
    renderToday([], { backlog: [lru, mergeK] })
    await user.click(screen.getByRole('button', { name: 'Remove LRU Cache from the backlog' }))
    expect(useTracker.getState().backlog).toEqual([mergeK])

    act(() => useUI.getState().toast!.action!.run())
    expect(useTracker.getState().backlog).toEqual([lru, mergeK])
  })
})
