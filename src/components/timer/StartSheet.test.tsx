import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROBLEMS } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { usePrefs, useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { StartSheet } from './StartSheet'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn(), prefersMotion: () => false }))

const today = '2026-10-26'
const twoSum = idOf('Two Sum')

function openFor(id: number) {
  useUI.setState({ startFor: id })
  render(<StartSheet today={today} />)
  return screen.getByRole('dialog', { name: /^Start / })
}

describe('StartSheet', () => {
  beforeEach(() => vi.mocked(openInNewTab).mockClear())

  it('starts the timer and opens the site you pick', async () => {
    openFor(twoSum)
    await userEvent.setup().click(screen.getByRole('button', { name: /^LeetCode/ }))

    expect(useTracker.getState().timer?.id).toBe(twoSum)
    expect(openInNewTab).toHaveBeenCalledOnce()
    expect(openInNewTab).toHaveBeenCalledWith('https://leetcode.com/problems/two-sum/')
    expect(useUI.getState()).toMatchObject({ startFor: null, openedOn: { id: twoSum, site: 'leetcode' } })
  })

  it('"Just start the timer" starts it without opening a tab', async () => {
    openFor(twoSum)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Just start the timer' }))
    expect(useTracker.getState().timer?.id).toBe(twoSum)
    expect(openInNewTab).not.toHaveBeenCalled()
    expect(useUI.getState().startFor).toBeNull()
  })

  it.each([
    ['the close button', (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Close without starting' }))],
    ['Escape', (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
    ['a click outside', (user: ReturnType<typeof userEvent.setup>) => user.click(document.querySelector('[data-slot="sheet-overlay"]')!)],
  ])('closing it with %s starts nothing', async (_, close) => {
    const user = userEvent.setup()
    openFor(twoSum)
    await user.click(screen.getByRole('switch', { name: 'Remember my choice' }))
    await close(user)
    expect(useTracker.getState().timer).toBeNull()
    expect(openInNewTab).not.toHaveBeenCalled()
    expect(useUI.getState().startFor).toBeNull()
    expect(usePrefs.getState().startOpens).toBe('ask')
  })

  it('puts focus back on the button that opened it', async () => {
    const user = userEvent.setup()
    const { getByRole } = render(<button type="button" onClick={() => useUI.getState().openStart(twoSum)}>Start Two Sum</button>)
    const start = getByRole('button', { name: 'Start Two Sum' })
    render(<StartSheet today={today} />)
    await user.click(start)
    await user.keyboard('{Escape}')
    expect(start).toHaveFocus()
  })

  it('remembers the choice on this device when asked to', async () => {
    const user = userEvent.setup()
    openFor(twoSum)
    await user.click(screen.getByRole('switch', { name: 'Remember my choice' }))
    await user.click(screen.getByRole('button', { name: /^NeetCode/ }))
    expect(usePrefs.getState().startOpens).toBe('neetcode')
  })

  it('remembers "only the timer" too', async () => {
    const user = userEvent.setup()
    openFor(twoSum)
    await user.click(screen.getByRole('switch', { name: 'Remember my choice' }))
    await user.click(screen.getByRole('button', { name: 'Just start the timer' }))
    expect(usePrefs.getState().startOpens).toBe('nothing')
  })

  it('points Premium problems to the free copy on NeetCode', () => {
    openFor(PROBLEMS.find((p) => p.premium)!.id)
    expect(screen.getByRole('button', { name: /^LeetCode/ })).toHaveTextContent('Needs LeetCode Premium')
    expect(screen.getByRole('button', { name: /^NeetCode/ })).toHaveTextContent('Free')
  })
})
