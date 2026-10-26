import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useTracker, useUI } from '@/lib/store'
import { RoutineSettings } from './RoutineSettings'

describe('RoutineSettings', () => {
  it('shows a stepper for each goal', () => {
    render(<RoutineSettings />)
    for (const name of ['Practice days a week', 'Problems on weekdays', 'Problems on weekends']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument()
    }
  })

  it('switches Core 150 first off and on', async () => {
    const user = userEvent.setup()
    render(<RoutineSettings />)
    const toggle = screen.getByRole('switch', { name: 'Core 150 first' })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(useTracker.getState().coreFirst).toBe(false)
    expect(toggle).not.toBeChecked()
  })

  it('opens the calendar export', async () => {
    const user = userEvent.setup()
    render(<RoutineSettings />)
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    expect(useUI.getState().calendarOpen).toBe(true)
  })
})
