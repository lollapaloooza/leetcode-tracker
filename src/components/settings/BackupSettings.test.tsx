import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { downloadFile } from '@/lib/_utils/browser'
import { exportable, useTracker } from '@/lib/store'
import { attempt, progressOf, tracker } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { BackupSettings } from './BackupSettings'

vi.mock('@/lib/_utils/browser', () => ({ downloadFile: vi.fn(), openInNewTab: vi.fn() }))

const backup = tracker({ progress: progressOf('solved', 'Two Sum'), attempts: [attempt('Two Sum', '2026-10-20')] })
const file = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' })

describe('BackupSettings', () => {
  it('exports everything saved as a dated JSON file', async () => {
    const user = userEvent.setup()
    resetStores(backup)
    render(<BackupSettings />)

    await user.click(screen.getByRole('button', { name: 'Export backup' }))
    const [name, content, type] = vi.mocked(downloadFile).mock.calls[0]
    expect(name).toMatch(/^leetcode-tracker-\d{4}-\d{2}-\d{2}\.json$/)
    expect(type).toBe('application/json')
    expect(JSON.parse(content)).toEqual(exportable(backup))
  })

  it('shows what a backup holds and replaces your progress once you confirm', async () => {
    const user = userEvent.setup()
    render(<BackupSettings />)

    await user.upload(screen.getByLabelText('Backup file to import'), file(JSON.stringify(exportable(backup))))
    const dialog = await screen.findByRole('dialog', { name: 'Replace your progress?' })
    expect(dialog).toHaveTextContent('backup.json')
    expect(dialog).toHaveTextContent('1 solved')
    expect(dialog).toHaveTextContent('1 attempt')
    expect(useTracker.getState().attempts).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: 'Replace progress' }))
    expect(useTracker.getState().attempts).toEqual(backup.attempts)
  })

  it('leaves your progress alone when you cancel', async () => {
    const user = userEvent.setup()
    render(<BackupSettings />)

    await user.upload(screen.getByLabelText('Backup file to import'), file(JSON.stringify(exportable(backup))))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(useTracker.getState().progress).toEqual({})
  })

  it("explains why a file can't be imported", async () => {
    const user = userEvent.setup()
    render(<BackupSettings />)

    await user.upload(screen.getByLabelText('Backup file to import'), file('not json at all', 'notes.txt'))
    const dialog = await screen.findByRole('dialog', { name: "Can't import this file" })
    expect(dialog).toHaveTextContent("isn't valid JSON")

    await user.click(within(dialog).getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
