import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PROBLEMS, problemById } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { NowCard } from './NowCard'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn() }))

const today = '2026-10-26'
const mergeK = problemById.get(idOf('Merge K Sorted Lists'))!
// Paused, so the clock holds still during the test.
const pausedAt = (minutes: number, seconds = 0) => ({ id: mergeK.id, startedAt: null, elapsed: (minutes * 60 + seconds) * 1000 })

function renderCard(props: Partial<Parameters<typeof NowCard>[0]> = {}) {
  render(<NowCard problem={mergeK} today={today} bonus={false} {...props} />)
  return screen.getByRole('region', { name: 'Merge K Sorted Lists' })
}

describe('NowCard', () => {
  it('shows the problem up next with its time box, and starts it on LeetCode', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { [today]: [{ id: mergeK.id, done: false }] } })
    const card = renderCard()
    expect(card).toHaveTextContent('Up next')
    expect(card).toHaveTextContent('40-minute time box')

    await user.click(within(card).getByRole('button', { name: 'Start — opens LeetCode' }))
    expect(useTracker.getState().timer?.id).toBe(mergeK.id)
    expect(openInNewTab).toHaveBeenCalledWith('https://leetcode.com/problems/merge-k-sorted-lists/')
    expect(card).toHaveTextContent('Working on it')
  })

  it("starts a Premium problem on NeetCode's free copy", () => {
    const premium = PROBLEMS.find((p) => p.premium)!
    render(<NowCard problem={premium} today={today} bonus={false} />)
    expect(screen.getByRole('button', { name: 'Start — opens NeetCode' })).toBeInTheDocument()
  })

  it('shows the clock against the time box', () => {
    resetStores({ timer: pausedAt(14, 3) })
    const card = renderCard()
    expect(within(card).getByRole('timer')).toHaveTextContent('14:03')
    expect(card).toHaveTextContent('of 40:00 · 26 min left')
    expect(card).toHaveTextContent('Paused')
  })

  it('says how far over the time box you are', () => {
    resetStores({ timer: pausedAt(47) })
    expect(renderCard()).toHaveTextContent('7 min over 40:00')
  })

  it('resumes and pauses the timer', async () => {
    const user = userEvent.setup()
    resetStores({ timer: pausedAt(5) })
    const card = renderCard()

    await user.click(within(card).getByRole('button', { name: 'Resume' }))
    expect(useTracker.getState().timer?.startedAt).not.toBeNull()
    await user.click(within(card).getByRole('button', { name: 'Pause' }))
    expect(useTracker.getState().timer?.startedAt).toBeNull()
  })

  it('stops the clock and opens the log when you are done', async () => {
    const user = userEvent.setup()
    resetStores({ timer: { ...pausedAt(5), startedAt: Date.now() } })
    const card = renderCard()

    await user.click(within(card).getByRole('button', { name: 'Done — log attempt' }))
    expect(useTracker.getState().timer?.startedAt).toBeNull()
    expect(useUI.getState().log).toEqual({ id: mergeK.id })
  })

  it('can discard the timer from its menu', async () => {
    const user = userEvent.setup()
    resetStores({ timer: pausedAt(5) })
    renderCard()

    await user.click(screen.getByRole('button', { name: 'More actions for Merge K Sorted Lists' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Discard timer' }))
    expect(useTracker.getState().timer).toBeNull()
  })

  it('marks a problem past the goal as a bonus', () => {
    expect(renderCard({ bonus: true })).toHaveTextContent('Bonus')
  })
})
