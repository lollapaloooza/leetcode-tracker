import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useUI } from '@/lib/store'
import { SettingsSheet } from './SettingsSheet'

const today = '2026-10-26'

describe('SettingsSheet', () => {
  it('stays closed until opened', () => {
    render(<SettingsSheet today={today} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('holds the routine, interview, appearance and data settings', () => {
    useUI.setState({ settingsOpen: true })
    render(<SettingsSheet today={today} />)

    const sheet = screen.getByRole('dialog', { name: 'Settings' })
    for (const group of ['Routine', 'Interview', 'Appearance', 'Your data']) {
      expect(screen.getByRole('region', { name: group })).toBeInTheDocument()
    }
    expect(sheet).toBeVisible()
  })

  it('closes from its close button', async () => {
    const user = userEvent.setup()
    useUI.setState({ settingsOpen: true })
    render(<SettingsSheet today={today} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(useUI.getState().settingsOpen).toBe(false)
  })
})
