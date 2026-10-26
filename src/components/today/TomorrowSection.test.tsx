import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { useTracker } from '@/lib/store'
import { idOf, progressOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { sortableId } from './board-lists'
import { LaterSection } from './LaterSection'
import { TomorrowSection } from './TomorrowSection'

const today = '2026-10-26' // Monday; tomorrow is a weekday too
const tomorrow = '2026-10-27'
const [twoSum, lru, mergeK] = ['Two Sum', 'LRU Cache', 'Merge K Sorted Lists'].map(idOf)

function renderTomorrow(ids: number[]) {
  render(
    <DndContext>
      <TomorrowSection today={today} ids={ids.map((id) => sortableId('tomorrow', id))} />
    </DndContext>,
  )
}

describe('TomorrowSection', () => {
  it('asks to pick tomorrow tonight, and picks toward its goal', async () => {
    const user = userEvent.setup()
    resetStores({ weekdayGoal: 2 })
    renderTomorrow([])
    expect(screen.getByText(/Pick tomorrow's problems tonight/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pick 2' }))
    expect(useTracker.getState().plans[tomorrow]).toHaveLength(2)
  })

  it('says why each problem is there', () => {
    resetStores({
      plans: { [tomorrow]: [{ id: twoSum, done: false }, { id: lru, done: false }, { id: mergeK, done: false }] },
      progress: progressOf('solved', 'Two Sum'),
      // Watched tonight counts; a video watched last week doesn't.
      studies: [
        { key: 'st', id: mergeK, date: today, at: `${today}T21:00:00.000Z` },
        { key: 'old', id: lru, date: '2026-10-19', at: '2026-10-19T21:00:00.000Z' },
      ],
    })
    renderTomorrow([twoSum, lru, mergeK])
    const rows = within(screen.getByRole('list', { name: "Tomorrow's problems" })).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Arrays & Hashing · Review'),
      expect.stringContaining('Linked List · New'),
      expect.stringContaining('Watched today — now solve it'),
    ])
  })

  it('moves a problem into today', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { [tomorrow]: [{ id: lru, done: false }] } })
    renderTomorrow([lru])

    await user.click(screen.getByRole('button', { name: 'More actions for LRU Cache' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to today' }))
    expect(useTracker.getState().plans).toMatchObject({ [today]: [{ id: lru, done: false }], [tomorrow]: [] })
  })
})

describe('LaterSection', () => {
  it('shows problems put off past tomorrow, with their day', () => {
    resetStores({ plans: { [tomorrow]: [{ id: twoSum, done: false }], '2026-10-31': [{ id: mergeK, done: false }] } })
    render(<LaterSection today={today} />)
    const list = screen.getByRole('list', { name: 'Later problems' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('Merge K Sorted Lists')
    expect(list).toHaveTextContent('Sat, Oct 31 · Linked List')
  })

  it('brings one back to today', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { '2026-10-31': [{ id: mergeK, done: false }] } })
    render(<LaterSection today={today} />)

    await user.click(screen.getByRole('button', { name: 'More actions for Merge K Sorted Lists' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to today' }))
    expect(useTracker.getState().plans[today]).toEqual([{ id: mergeK, done: false }])
    expect(screen.queryByRole('list', { name: 'Later problems' })).not.toBeInTheDocument()
  })

  it('shows nothing when nothing is put off', () => {
    const { container } = render(<LaterSection today={today} />)
    expect(container).toBeEmptyDOMElement()
  })
})
