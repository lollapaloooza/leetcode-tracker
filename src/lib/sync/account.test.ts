// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { savedUid, useAccount, type Account } from '@/lib/store'
import { signInError, signInWith, signOutWith, watchAccount, type AuthClient } from './account'

const ada: Account = { uid: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', photo: null }

/** A sign-in provider under the test's control: `report` plays the provider announcing who's signed in. */
function fakeClient(signIn: () => Promise<void> = async () => {}) {
  let listener: (account: Account | null) => void = () => {}
  const client: AuthClient = {
    onUserChanged: (callback) => {
      listener = callback
      return () => {}
    },
    signIn: vi.fn(signIn),
    signOut: vi.fn(async () => listener(null)),
  }
  return { client, report: (account: Account | null) => listener(account) }
}

const failWith = (code: string) => async () => {
  throw Object.assign(new Error(code), { code })
}

describe('account', () => {
  beforeEach(() => {
    localStorage.clear()
    useAccount.setState(useAccount.getInitialState(), true)
  })

  it('follows the provider, and remembers the uid for the next visit', () => {
    const { client, report } = fakeClient()
    watchAccount(client)

    report(ada)
    expect(useAccount.getState()).toMatchObject({ status: 'signed-in', account: ada })
    expect(savedUid()).toBe('u1')

    report(null)
    expect(useAccount.getState()).toMatchObject({ status: 'signed-out', account: null })
    expect(savedUid()).toBeNull()
  })

  it('stays signing in when the provider reports nobody while the popup is open', async () => {
    let finish = () => {}
    const { client, report } = fakeClient(() => new Promise<void>((resolve) => (finish = resolve)))
    watchAccount(client)

    const signingIn = signInWith(client)
    report(null)
    expect(useAccount.getState().status).toBe('signing-in')

    report(ada)
    finish()
    await signingIn
    expect(useAccount.getState()).toMatchObject({ status: 'signed-in', account: ada, error: null })
  })

  it('takes a closed popup as changing your mind, not an error', async () => {
    const { client } = fakeClient(failWith('auth/popup-closed-by-user'))
    await signInWith(client)
    expect(useAccount.getState()).toMatchObject({ status: 'signed-out', error: null })
  })

  it('says why sign-in failed', async () => {
    const { client } = fakeClient(failWith('auth/popup-blocked'))
    await signInWith(client)
    expect(useAccount.getState().status).toBe('signed-out')
    expect(useAccount.getState().error).toMatch(/Allow pop-ups/)
  })

  it('clears an old error when you try again', async () => {
    useAccount.setState({ error: 'Couldn’t reach Google.' })
    const { client } = fakeClient()
    await signInWith(client)
    expect(useAccount.getState().error).toBeNull()
  })

  it('signs out through the provider, and never throws', async () => {
    const { client, report } = fakeClient()
    watchAccount(client)
    report(ada)

    await signOutWith(client)
    expect(useAccount.getState()).toMatchObject({ status: 'signed-out', account: null })

    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(client.signOut).mockRejectedValueOnce(new Error('offline'))
    await expect(signOutWith(client)).resolves.toBeUndefined()
    expect(logged).toHaveBeenCalled()
  })
})

describe('signInError', () => {
  it.each([
    ['auth/popup-closed-by-user', null],
    ['auth/cancelled-popup-request', null],
    ['auth/network-request-failed', /connection/],
    ['auth/unauthorized-domain', /Authorized domains/],
    ['auth/operation-not-allowed', /Sign-in method/],
  ])('%s', (code, expected) => {
    const message = signInError({ code })
    if (expected === null) expect(message).toBeNull()
    else expect(message).toMatch(expected)
  })

  it('gives a general message for anything else, and logs it', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(signInError(new Error('boom'))).toBe('Sign-in didn’t work. Try again in a moment.')
    expect(logged).toHaveBeenCalledOnce()
    logged.mockRestore()
  })
})
