import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useUI } from '@/lib/store'
import { Overlays } from './Overlays'

const today = '2026-10-26'

describe('Overlays', () => {
  it('loads nothing until a panel is opened', () => {
    render(<Overlays today={today} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles the command palette with ⌘K / Ctrl+K', async () => {
    const user = userEvent.setup()
    render(<Overlays today={today} />)

    await user.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
    expect(useUI.getState().paletteOpen).toBe(true)

    await user.keyboard('{Control>}k{/Control}')
    expect(useUI.getState().paletteOpen).toBe(false)
  })

  it('opens Settings when asked', async () => {
    render(<Overlays today={today} />)
    act(() => useUI.getState().setSettingsOpen(true))
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })
})
