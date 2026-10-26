import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { DocumentTitle } from './DocumentTitle'

describe('DocumentTitle', () => {
  afterEach(() => vi.useRealTimers())

  it('is the app name when nothing is being timed', () => {
    render(<DocumentTitle />)
    expect(document.title).toBe('LeetCode Tracker')
  })

  it('shows the running clock and the problem', () => {
    vi.useFakeTimers({ now: new Date('2026-10-26T19:00:00') })
    resetStores({ timer: { id: idOf('Two Sum'), startedAt: Date.now() - 65_000, elapsed: 0 } })
    render(<DocumentTitle />)
    expect(document.title).toBe('▶ 1:05 · Two Sum — LeetCode Tracker')
  })

  it('says when the timer is paused', () => {
    resetStores({ timer: { id: idOf('Two Sum'), startedAt: null, elapsed: 65_000 } })
    render(<DocumentTitle />)
    expect(document.title).toBe('⏸ Paused · Two Sum — LeetCode Tracker')
  })
})
