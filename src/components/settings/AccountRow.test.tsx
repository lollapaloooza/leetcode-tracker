import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccount, type Account } from '@/lib/store'
import { loadSync } from '@/lib/sync/load'
import { AccountRow } from './AccountRow'

const ada: Account = { uid: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', photo: null }

describe('AccountRow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signs in with Google, and fetches the sign-in code as soon as Settings opens', async () => {
    const sync = await loadSync()
    vi.clearAllMocks()
    render(<AccountRow />)
    expect(loadSync).toHaveBeenCalledOnce()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }))
    expect(sync.signIn).toHaveBeenCalledOnce()
  })

  it('waits while the popup is open', () => {
    useAccount.setState({ status: 'signing-in' })
    render(<AccountRow />)
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })

  it('shows nothing to press while an earlier sign-in is restored', () => {
    useAccount.setState({ status: 'checking' })
    render(<AccountRow />)
    expect(screen.getByText('Checking your sign-in…')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says why sign-in failed, and offers it again', () => {
    useAccount.setState({ status: 'signed-out', error: 'Couldn’t reach Google.' })
    render(<AccountRow />)
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t reach Google.')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('shows who is signed in, and signs out', async () => {
    const sync = await loadSync()
    useAccount.setState({ status: 'signed-in', account: ada })
    render(<AccountRow />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    expect(sync.signOut).toHaveBeenCalledOnce()
  })

  it('falls back to the initial when the profile photo won’t load', () => {
    useAccount.setState({ status: 'signed-in', account: { ...ada, photo: 'https://example.com/ada.png' } })
    const { container } = render(<AccountRow />)
    const photo = container.querySelector('img')!
    expect(photo).toHaveAttribute('src', 'https://example.com/ada.png')
    expect(screen.queryByText('A')).not.toBeInTheDocument()

    fireEvent.error(photo)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
