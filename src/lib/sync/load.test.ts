// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real chunk would bring in Firebase; these tests are about when and how it loads.
const sync = vi.hoisted(() => ({ startSync: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }))
vi.mock('./index', () => sync)

/** A fresh loader (nothing loaded yet) and the account store it reads. */
async function fresh() {
  vi.resetModules()
  const [load, { useAccount }] = await Promise.all([import('./load'), import('@/lib/store')])
  return { ...load, useAccount }
}

describe('loading the sync chunk', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.useRealTimers())

  it('runs the action right away once the chunk is loaded, so the popup opens inside the click', async () => {
    const { loadSync, withSync } = await fresh()
    const run = vi.fn()
    withSync(run)
    expect(run).not.toHaveBeenCalled() // still loading

    await loadSync()
    expect(run).toHaveBeenCalledOnce()
    withSync(run)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('restores an earlier sign-in once the page is idle', async () => {
    vi.useFakeTimers()
    const { resumeSync, useAccount } = await fresh()
    useAccount.setState({ status: 'checking' })
    resumeSync()
    expect(sync.startSync).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()
    expect(sync.startSync).toHaveBeenCalledOnce()
  })

  it('never loads Firebase for someone who hasn’t signed in', async () => {
    vi.useFakeTimers()
    const { resumeSync } = await fresh()
    resumeSync()
    await vi.runAllTimersAsync()
    expect(sync.startSync).not.toHaveBeenCalled()
  })

  it('says so when the chunk can’t be downloaded, and tries again next time', async () => {
    vi.doMock('./index', () => {
      throw new Error('offline')
    })
    const { loadSync, withSync, useAccount } = await fresh()
    useAccount.setState({ status: 'checking' })
    withSync(vi.fn())
    await expect(loadSync()).rejects.toThrow()
    await vi.waitFor(() => expect(useAccount.getState().error).toMatch(/Couldn’t load sign-in/))
    expect(useAccount.getState().status).toBe('signed-out')

    vi.doMock('./index', () => sync)
    expect((await loadSync()).startSync).toBe(sync.startSync)
  })
})
