import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useTracker } from '@/lib/store'
import { resetStores } from '@/test/stores'
import { GoalStepper } from './GoalStepper'

describe('GoalStepper', () => {
  it('steps the goal up and down', async () => {
    const user = userEvent.setup()
    resetStores({ weekdayGoal: 2 })
    render(<GoalStepper kind="weekdayGoal" label="Problems on weekdays" />)
    const stepper = screen.getByRole('group', { name: 'Problems on weekdays' })

    await user.click(screen.getByRole('button', { name: 'More problems on weekdays' }))
    expect(useTracker.getState().weekdayGoal).toBe(3)
    expect(stepper).toHaveTextContent('3')

    await user.click(screen.getByRole('button', { name: 'Fewer problems on weekdays' }))
    await user.click(screen.getByRole('button', { name: 'Fewer problems on weekdays' }))
    expect(useTracker.getState().weekdayGoal).toBe(1)
  })

  it('disables the step that would leave the allowed range', () => {
    resetStores({ weekdayGoal: 1, weeklyDays: 7 })
    render(
      <>
        <GoalStepper kind="weekdayGoal" label="Problems on weekdays" />
        <GoalStepper kind="weeklyDays" label="Practice days a week" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Fewer problems on weekdays' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'More problems on weekdays' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'More practice days a week' })).toBeDisabled()
  })
})
