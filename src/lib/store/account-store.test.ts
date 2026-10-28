// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { saveUid, savedUid } from './account-store'

describe('saved uid', () => {
  beforeEach(() => localStorage.clear())

  it('is kept for the next visit, and cleared on sign-out', () => {
    saveUid('u1')
    expect(savedUid()).toBe('u1')
    saveUid(null)
    expect(savedUid()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.sync)).toBeNull()
  })

  it.each(['not json', '"u1"', '{"uid":42}', '{"uid":""}', 'null'])('reads %s as signed out', (raw) => {
    localStorage.setItem(STORAGE_KEYS.sync, raw)
    expect(savedUid()).toBeNull()
  })

  it('makes the next visit start by checking the sign-in', async () => {
    saveUid('u1')
    vi.resetModules()
    const { useAccount } = await import('./account-store')
    expect(useAccount.getState().status).toBe('checking')
  })
})
