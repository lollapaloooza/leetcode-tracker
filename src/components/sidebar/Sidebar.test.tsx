import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useUI } from '@/lib/store'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('shows only what changes day to day', () => {
    render(<Sidebar today="2026-10-26" />)
    const cards = screen.getAllByRole('region').map((card) => card.getAttribute('aria-labelledby'))
    const titles = cards.map((id) => document.getElementById(id!)?.textContent)
    expect(titles).toEqual(['Progress', 'This week', 'Focus'])
  })

  it('points to Settings for the rest', async () => {
    const user = userEvent.setup()
    render(<Sidebar today="2026-10-26" />)
    await user.click(screen.getByRole('button', { name: 'Routine, interview date and backup' }))
    expect(useUI.getState().settingsOpen).toBe(true)
  })
})
