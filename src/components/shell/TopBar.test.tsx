import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import { useUI } from '@/lib/store'
import { TopBar } from './TopBar'

// The header holds the tab list, so it renders inside the page's tabs.
const renderTopBar = () =>
  render(
    <Tabs value="today">
      <TopBar today="2026-10-26" />
    </Tabs>,
  )

describe('TopBar', () => {
  it.each([
    ['Settings', 'settingsOpen'],
    [/^Search/, 'paletteOpen'],
    ['Open Python cheatsheet', 'pythonOpen'],
  ] as const)('the %s button opens its panel', async (name, flag) => {
    const user = userEvent.setup()
    renderTopBar()
    await user.click(screen.getByRole('button', { name }))
    expect(useUI.getState()[flag]).toBe(true)
  })

  it('switches between light and dark', async () => {
    const user = userEvent.setup()
    renderTopBar()

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
