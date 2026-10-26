import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WIDE_SCREEN } from '@/lib/_consts/layout'
import App from './App'

/** Pretend the window is wide (the sidebar beside the list) or narrow. jsdom draws no CSS, so both tab lists are there. */
function screenWidth(wide: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query === WIDE_SCREEN && wide,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )
}

const headerTab = (name: RegExp) => within(screen.getByRole('banner')).getByRole('tab', { name })
const barButton = (name: string) => within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name })

describe('App', () => {
  it('switches tabs from the header and from the phone tab bar alike', async () => {
    const user = userEvent.setup()
    screenWidth(false)
    render(<App />)

    await user.click(headerTab(/^Problems/))
    expect(barButton('Problems')).toHaveAttribute('aria-current', 'page')

    await user.click(barButton('Progress'))
    expect(headerTab(/History/)).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('No history yet')).toBeInTheDocument()
  })

  it('keeps progress in a sidebar on wide screens', () => {
    screenWidth(true)
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Progress' })).toBeInTheDocument()
  })

  it('moves progress into its tab on narrower screens', async () => {
    const user = userEvent.setup()
    screenWidth(false)
    render(<App />)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    await user.click(barButton('Progress'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('This week')
  })
})
