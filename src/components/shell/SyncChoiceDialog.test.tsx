import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccount } from '@/lib/store'
import { loadSync } from '@/lib/sync/load'
import { attempt, progressOf, tracker } from '@/test/builders'
import { SyncChoiceDialog } from './SyncChoiceDialog'

const cloud = tracker({ progress: progressOf('solved', 'Two Sum', 'Valid Anagram'), attempts: [attempt('Two Sum', '2026-10-27')] })
const device = tracker({})

describe('SyncChoiceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAccount.setState({ choice: { cloud, device } })
  })

  it('shows both sides in a few words, and keeps the one you select', async () => {
    const sync = await loadSync()
    render(<SyncChoiceDialog />)
    expect(screen.getByRole('dialog', { name: 'Select the progress to keep' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cloud/ })).toHaveTextContent('2 solved · 1 attempt')
    expect(screen.getByRole('button', { name: /^This device/ })).toHaveTextContent('0 solved · 0 attempts')

    await userEvent.setup().click(screen.getByRole('button', { name: /^Cloud/ }))
    expect(sync.answerChoice).toHaveBeenCalledWith('cloud')
  })

  it('asks again on the next visit when closed', async () => {
    const sync = await loadSync()
    render(<SyncChoiceDialog />)
    await userEvent.setup().keyboard('{Escape}')
    expect(sync.answerChoice).toHaveBeenCalledWith(null)
  })
})
