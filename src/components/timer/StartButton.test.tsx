import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { problemById } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { usePrefs, useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { StartButton } from './StartButton'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn(), prefersMotion: () => false }))

const today = '2026-10-26'
const twoSum = problemById.get(idOf('Two Sum'))!
const start = () => userEvent.setup().click(screen.getByRole('button', { name: 'Start Two Sum' }))

describe('StartButton', () => {
  it('asks where to solve it before anything starts', async () => {
    render(<StartButton problem={twoSum} today={today} />)
    await start()
    expect(useUI.getState().startFor).toBe(twoSum.id)
    expect(useTracker.getState().timer).toBeNull()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it('goes straight to a remembered site, with a way back to asking', async () => {
    usePrefs.setState({ startOpens: 'neetcode' })
    render(<StartButton problem={twoSum} today={today} />)
    await start()
    expect(useTracker.getState().timer).toMatchObject({ id: twoSum.id, elapsed: 0 })
    expect(openInNewTab).toHaveBeenCalledWith(expect.stringContaining('neetcode.io/problems/'))

    const toast = useUI.getState().toast!
    expect(toast.text).toBe('Started · opened NeetCode')
    toast.action!.run()
    expect(usePrefs.getState().startOpens).toBe('ask')
  })

  it('only starts the timer when told to open nothing', async () => {
    usePrefs.setState({ startOpens: 'nothing' })
    render(<StartButton problem={twoSum} today={today} />)
    await start()
    expect(useTracker.getState().timer?.id).toBe(twoSum.id)
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it('hides while another problem is being timed', () => {
    resetStores({ timer: { id: idOf('3Sum'), startedAt: null, elapsed: 0 } })
    const { container } = render(<StartButton problem={twoSum} today={today} />)
    expect(container).toBeEmptyDOMElement()
  })
})
