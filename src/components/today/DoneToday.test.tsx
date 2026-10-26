import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useTracker } from '@/lib/store'
import { attempt, idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { DoneToday } from './DoneToday'

const today = '2026-10-26'
const lru = idOf('LRU Cache')
const solved = attempt('LRU Cache', today, { key: 'lru-1', seconds: 21 * 60, prev: { status: undefined, planned: true, done: false } })
const items = [{ id: lru, done: true, attempt: 'lru-1' }]

function renderDone() {
  resetStores({
    plans: { [today]: items },
    attempts: [solved],
    progress: { [lru]: { status: 'solved', updatedAt: solved.at } },
    reviews: { [lru]: { step: 0, due: '2026-10-29' } },
  })
  render(<DoneToday items={items} today={today} />)
}

describe('DoneToday', () => {
  it('shows nothing until something is done', () => {
    const { container } = render(<DoneToday items={[]} today={today} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists what is finished: how it went, against the time box, and when it comes back', () => {
    renderDone()
    expect(screen.getByText('Done today')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Done today' })).toHaveTextContent('Solved · 21 of 25 min · review in 3 days')
  })

  it('folds away', async () => {
    const user = userEvent.setup()
    renderDone()
    await user.click(screen.getByText('Done today'))
    expect(screen.getByRole('list', { name: 'Done today', hidden: true })).not.toBeVisible()
  })

  it('undoes an attempt from its mark', async () => {
    const user = userEvent.setup()
    renderDone()
    await user.click(screen.getByRole('button', { name: 'LRU Cache: Solved. Edit or undo' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Undo' }))
    expect(useTracker.getState().attempts).toEqual([])
    expect(useTracker.getState().plans[today]).toEqual([{ id: lru, done: false }])
  })
})
