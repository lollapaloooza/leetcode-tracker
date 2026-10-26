import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { AppearanceSettings } from './AppearanceSettings'

describe('AppearanceSettings', () => {
  it('follows the system until you pick a theme', () => {
    render(<AppearanceSettings />)
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
    expect(screen.getByText('Follows your device')).toBeInTheDocument()
  })

  it('applies and remembers the theme you pick, and can go back to the system', async () => {
    const user = userEvent.setup()
    render(<AppearanceSettings />)

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'System' }))
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBeNull()
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
  })
})
