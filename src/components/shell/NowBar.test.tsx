import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { NowBar } from './NowBar'

const today = '2026-10-26'
const twoSum = idOf('Two Sum')
// Paused, so the clock doesn't tick during the test.
const pausedTimer = { id: twoSum, startedAt: null, elapsed: 125_000 }

function renderAway() {
  resetStores({ timer: pausedTimer })
  useUI.setState({ tab: 'all' })
  render(<NowBar today={today} />)
}

describe('NowBar', () => {
  it('shows the problem on the clock against its time box', () => {
    renderAway()
    const bar = screen.getByRole('region', { name: 'On the clock' })
    expect(bar).toHaveTextContent('Two Sum')
    expect(bar).toHaveTextContent('2:05 of 15:00')
  })

  it('leads back to Today', async () => {
    const user = userEvent.setup()
    renderAway()
    await user.click(screen.getByRole('button', { name: 'Two Sum, 2:05 of 15 minutes. Go to Today' }))
    expect(useUI.getState().tab).toBe('today')
  })

  it('resumes and pauses the clock', async () => {
    const user = userEvent.setup()
    renderAway()

    await user.click(screen.getByRole('button', { name: 'Resume timer' }))
    expect(useTracker.getState().timer?.startedAt).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Pause timer' }))
    expect(useTracker.getState().timer).toMatchObject({ startedAt: null })
  })

  it('stops the clock and opens the log', async () => {
    const user = userEvent.setup()
    resetStores({ timer: { id: twoSum, startedAt: Date.now(), elapsed: 0 } })
    useUI.setState({ tab: 'patterns' })
    render(<NowBar today={today} />)

    await user.click(screen.getByRole('button', { name: 'Log attempt' }))
    expect(useUI.getState().log).toEqual({ id: twoSum })
    expect(useTracker.getState().timer?.startedAt).toBeNull()
  })

  it('stays out of the way on Today, and without a timer', () => {
    resetStores({ timer: pausedTimer })
    const { container, rerender } = render(<NowBar today={today} />)
    expect(container).toBeEmptyDOMElement()

    resetStores()
    useUI.setState({ tab: 'all' })
    rerender(<NowBar today={today} />)
    expect(container).toBeEmptyDOMElement()
  })
})
