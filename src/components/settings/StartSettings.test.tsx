import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { usePrefs } from '@/lib/store'
import { StartSettings } from './StartSettings'

describe('StartSettings', () => {
  it('asks each time until you choose otherwise', async () => {
    render(<StartSettings />)
    expect(screen.getByRole('radio', { name: 'Ask' })).toBeChecked()
    expect(screen.getByText('Asks each time whether to open LeetCode or NeetCode')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Timer' }))
    expect(usePrefs.getState().startOpens).toBe('nothing')
    expect(screen.getByText('Only starts the timer')).toBeInTheDocument()
  })
})
