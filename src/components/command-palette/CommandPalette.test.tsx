import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTracker, useUI } from '@/lib/store'
import { idOf } from '@/test/builders'
import { CommandPalette } from './CommandPalette'

const today = '2026-10-26'

function openPalette() {
  useUI.setState({ paletteOpen: true })
  render(<CommandPalette today={today} />)
  return screen.getByRole('combobox')
}

describe('CommandPalette', () => {
  beforeEach(() => useUI.setState({ paletteOpen: false }))

  it.each([
    ['settings', 'Settings'],
    ['interview', 'Set interview date'],
  ])('typing "%s" finds %s, which opens Settings and closes the palette', async (query, command) => {
    const user = userEvent.setup()
    await user.type(openPalette(), query)
    await user.click(screen.getByRole('option', { name: command }))

    expect(useUI.getState()).toMatchObject({ settingsOpen: true, paletteOpen: false })
  })

  it('finds a problem by its number and acts on it', async () => {
    const user = userEvent.setup()
    await user.type(openPalette(), '#1 two sum')
    await user.click(screen.getByRole('option', { name: /^Two Sum(?! II)/ }))

    expect(screen.getByRole('group', { name: 'Two Sum' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Add to today' }))
    expect(useTracker.getState().plans[today]).toEqual([{ id: idOf('Two Sum'), done: false }])
    expect(useUI.getState().paletteOpen).toBe(false)
  })

  it('steps back out of a problem with Backspace on an empty search', async () => {
    const user = userEvent.setup()
    await user.type(openPalette(), 'two sum')
    await user.click(screen.getByRole('option', { name: /^Two Sum(?! II)/ }))
    expect(screen.getByRole('group', { name: 'Two Sum' })).toBeInTheDocument()

    await user.keyboard('{Backspace}')
    expect(screen.getByRole('group', { name: 'Go to' })).toBeInTheDocument()
  })
})
