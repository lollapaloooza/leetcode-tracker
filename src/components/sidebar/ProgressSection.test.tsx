import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PROBLEMS } from '@/data/problems'
import { useUI } from '@/lib/store'
import { progressOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { ProgressSection } from './ProgressSection'

const today = '2026-10-26'
const card = () => screen.getByRole('region', { name: 'Progress' })

describe('ProgressSection', () => {
  it('counts solved problems overall and by difficulty', () => {
    resetStores({ progress: { ...progressOf('solved', 'Two Sum'), ...progressOf('helped', 'Merge K Sorted Lists'), ...progressOf('attempted', '3Sum') } })
    render(<ProgressSection today={today} />)

    expect(card()).toHaveTextContent('2/ 250 solved')
    expect(within(card()).getByText('Easy').closest('li')).toHaveTextContent('1 / 60')
    expect(within(card()).getByText('Hard').closest('li')).toHaveTextContent('1 / 35')
  })

  it('offers to set an interview date, in Settings', async () => {
    const user = userEvent.setup()
    render(<ProgressSection today={today} />)

    await user.click(screen.getByRole('button', { name: 'Set your interview date' }))
    expect(useUI.getState().settingsOpen).toBe(true)
  })

  it('shows the pace the interview date needs', () => {
    resetStores({ progress: progressOf('solved', 'Two Sum', 'Valid Anagram'), interview: { date: '2026-12-15', setOn: '2026-10-01', solvedAtSet: 20 } })
    render(<ProgressSection today={today} />)

    expect(card()).toHaveTextContent('Interview Dec 15')
    expect(card()).toHaveTextContent('50 days left')
    // 248 left over 50 days; a steady pace from Oct 1 would be at 96 by now.
    expect(card()).toHaveTextContent('5 a day to finish · 94 behind pace')
  })

  it('celebrates once everything is solved', () => {
    resetStores({
      progress: Object.fromEntries(PROBLEMS.map((p) => [p.id, { status: 'solved', updatedAt: '2026-10-01T00:00:00.000Z' }])),
      interview: { date: '2026-12-15', setOn: '2026-10-01', solvedAtSet: 20 },
    })
    render(<ProgressSection today={today} />)
    expect(card()).toHaveTextContent('All 250 done')
  })
})
