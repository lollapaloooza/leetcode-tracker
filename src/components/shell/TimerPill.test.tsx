import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { TimerPill } from './TimerPill'

// Paused, so the clock doesn't tick during the test.
const pausedTimer = { id: idOf('Two Sum'), startedAt: null, elapsed: 125_000 }

describe('TimerPill', () => {
  afterEach(() => vi.useRealTimers())

  it('stays out of the way on Today, where the timer is already on screen', () => {
    resetStores({ timer: pausedTimer })
    const { container } = render(<TimerPill />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the timed problem on other tabs and leads back to Today', async () => {
    const user = userEvent.setup()
    resetStores({ timer: pausedTimer })
    useUI.setState({ tab: 'history' })
    render(<TimerPill />)

    await user.click(screen.getByRole('button', { name: 'Paused Two Sum, 2:05. Go to Today' }))
    expect(useUI.getState().tab).toBe('today')
  })

  it('shows nothing without a timer', () => {
    useUI.setState({ tab: 'history' })
    const { container } = render(<TimerPill />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the time as of leaving Today, not as of page load', () => {
    vi.useFakeTimers({ now: new Date('2026-10-26T18:00:00Z') })
    resetStores({ timer: { id: idOf('Two Sum'), startedAt: Date.now(), elapsed: 0 } })
    render(<TimerPill />)

    vi.setSystemTime(new Date('2026-10-26T18:01:30Z'))
    act(() => useUI.setState({ tab: 'all' }))
    expect(screen.getByRole('button', { name: 'Working on Two Sum, 1:30. Go to Today' })).toBeInTheDocument()
  })
})
