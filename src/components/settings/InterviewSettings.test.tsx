import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import { localDate } from '@/lib/_utils/date'
import { useTracker } from '@/lib/store'
import { resetStores } from '@/test/stores'
import { InterviewSettings } from './InterviewSettings'
import { useInterviewDate } from './useInterviewDate'

const today = '2026-10-26'
const interview = { date: '2026-12-15', setOn: '2026-10-01', solvedAtSet: 20 }

describe('InterviewSettings', () => {
  // The date picker is lazy-loaded; load it up front, as the app does once it's idle.
  beforeAll(() => import('@/components/ui/calendar'))

  it('sets a date picked from the calendar', async () => {
    const user = userEvent.setup()
    render(<InterviewSettings today={today} />)

    await user.click(screen.getByRole('button', { name: 'Set interview date' }))
    // No date yet: the calendar opens a month out, on November.
    await user.click(await screen.findByRole('button', { name: /November 30th, 2026/ }))

    expect(useTracker.getState().interview).toEqual({ date: '2026-11-30', setOn: today, solvedAtSet: 0 })
    expect(screen.getByRole('button', { name: 'Interview date: Mon, Nov 30' })).toBeInTheDocument()
  })

  it('clears the date', async () => {
    const user = userEvent.setup()
    resetStores({ interview })
    render(<InterviewSettings today={today} />)

    await user.click(screen.getByRole('button', { name: 'Interview date: Tue, Dec 15' }))
    await user.click(await screen.findByRole('button', { name: 'Clear date' }))

    expect(useTracker.getState().interview).toBeNull()
    expect(screen.getByRole('button', { name: 'Set interview date' })).toBeInTheDocument()
  })
})

describe('useInterviewDate', () => {
  it('lets you pick from tomorrow on, and opens on the current date', () => {
    resetStores({ interview })
    const { result } = renderHook(() => useInterviewDate(today))
    expect(localDate(result.current.firstPickable)).toBe('2026-10-27')
    expect(localDate(result.current.month)).toBe('2026-12-15')
  })
})
