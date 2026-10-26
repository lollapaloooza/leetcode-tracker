import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useUI } from '@/lib/store'
import { MobileNav } from './MobileNav'

describe('MobileNav', () => {
  it('names the tabs as a phone shows them, marking the open one', () => {
    render(<MobileNav />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Today', 'Problems', 'Patterns', 'Progress'])
    expect(within(nav).getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches the same tab the header does', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByRole('button', { name: 'Progress' }))
    expect(useUI.getState().tab).toBe('history')
    expect(screen.getByRole('button', { name: 'Progress' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })
})
