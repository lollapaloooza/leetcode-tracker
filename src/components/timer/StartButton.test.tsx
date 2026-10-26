import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { problemById } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { useTracker } from '@/lib/store'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { StartButton } from './StartButton'

vi.mock('@/lib/_utils/browser', () => ({ openInNewTab: vi.fn(), downloadFile: vi.fn() }))

const today = '2026-10-26'
const twoSum = problemById.get(idOf('Two Sum'))!

describe('StartButton', () => {
  it('starts the timer and opens the problem in one click', async () => {
    const user = userEvent.setup()
    render(<StartButton problem={twoSum} today={today} />)

    await user.click(screen.getByRole('button', { name: 'Start Two Sum' }))
    expect(useTracker.getState().timer).toMatchObject({ id: twoSum.id, elapsed: 0 })
    expect(useTracker.getState().plans[today]).toEqual([{ id: twoSum.id, done: false }])
    expect(openInNewTab).toHaveBeenCalledWith('https://leetcode.com/problems/two-sum/')
  })

  it('hides while another problem is being timed', () => {
    resetStores({ timer: { id: idOf('3Sum'), startedAt: null, elapsed: 0 } })
    const { container } = render(<StartButton problem={twoSum} today={today} />)
    expect(container).toBeEmptyDOMElement()
  })
})
