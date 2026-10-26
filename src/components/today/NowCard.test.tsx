import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PROBLEMS, problemById } from '@/data/problems'
import { useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { NowCard } from './NowCard'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn(), prefersMotion: () => false }))

const today = '2026-10-26'
const mergeK = problemById.get(idOf('Merge K Sorted Lists'))!
// Paused, so the clock holds still during the test.
const pausedAt = (minutes: number, seconds = 0) => ({ id: mergeK.id, startedAt: null, elapsed: (minutes * 60 + seconds) * 1000 })

function renderCard(props: Partial<Parameters<typeof NowCard>[0]> = {}) {
  render(<NowCard problem={mergeK} today={today} bonus={false} {...props} />)
  return screen.getByRole('region', { name: 'Merge K Sorted Lists' })
}

describe('NowCard', () => {
  it('shows the problem up next with its time box; Start asks where to solve it', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { [today]: [{ id: mergeK.id, done: false }] } })
    const card = renderCard()
    expect(card).toHaveTextContent('Up next')
    expect(card).toHaveTextContent('40-minute time box')

    await user.click(within(card).getByRole('button', { name: 'Start' }))
    expect(useUI.getState().startFor).toBe(mergeK.id)
  })

  it('sets an unstarted problem aside in the backlog and leaves the spotlight empty, with Undo', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { [today]: [{ id: mergeK.id, done: false }, { id: idOf('Two Sum'), done: false }] } })
    const card = renderCard()

    await user.click(within(card).getByRole('button', { name: 'Remove Merge K Sorted Lists from today' }))
    expect(useTracker.getState()).toMatchObject({ plans: { [today]: [{ id: idOf('Two Sum') }] }, backlog: [mergeK.id] })
    expect(useUI.getState().focusClearedOn).toBe(today)

    const toast = useUI.getState().toast!
    expect(toast.text).toBe('Merge K Sorted Lists moved to the backlog')
    toast.action!.run()
    expect(useTracker.getState()).toMatchObject({ plans: { [today]: [{ id: mergeK.id }, { id: idOf('Two Sum') }] }, backlog: [] })
    expect(useUI.getState().focusClearedOn).toBeNull()
  })

  it('links back to the site the problem was opened on, and to the solution video', () => {
    resetStores({ timer: pausedAt(5) })
    useUI.setState({ openedOn: { id: mergeK.id, site: 'neetcode' } })
    const card = renderCard()
    expect(within(card).getByRole('link', { name: /^Open on NeetCode/ })).toHaveAttribute('href', expect.stringContaining('neetcode.io/problems/'))
    expect(within(card).getByRole('link', { name: /Solution video/ })).toHaveAttribute('href', expect.stringContaining('youtube.com'))
  })

  it("opens LeetCode — or a Premium problem's free copy — when it was only timed", () => {
    const premium = PROBLEMS.find((p) => p.premium)!
    resetStores({ timer: { id: premium.id, startedAt: null, elapsed: 0 } })
    render(<NowCard problem={premium} today={today} bonus={false} />)
    expect(screen.getByRole('link', { name: /^Open on NeetCode/ })).toBeInTheDocument()
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

  it('stops the timer and keeps the problem for later, with Undo', async () => {
    const user = userEvent.setup()
    resetStores({ plans: { [today]: [{ id: mergeK.id, done: false }] }, timer: pausedAt(5) })
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Stop the timer and keep the problem for later' }))
    expect(useTracker.getState().timer).toBeNull()
    expect(useTracker.getState().plans[today]).toEqual([{ id: mergeK.id, done: false }])
    expect(useUI.getState().focusClearedOn).toBe(today)

    const toast = useUI.getState().toast!
    expect(toast.text).toBe('Timer stopped at 5:00')
    toast.action!.run()
    expect(useTracker.getState().timer).toEqual(pausedAt(5))
  })

  it('marks a problem past the goal as a bonus', () => {
    expect(renderCard({ bonus: true })).toHaveTextContent('Bonus')
  })
})
