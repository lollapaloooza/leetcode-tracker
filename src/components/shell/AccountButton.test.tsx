import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PHONE_SCREEN } from '@/lib/_consts/layout'
import { downloadFile } from '@/lib/_utils/browser'
import { useAccount, useUI, type Account } from '@/lib/store'
import { loadSync } from '@/lib/sync/load'
import { AccountButton } from './AccountButton'

vi.mock('@/lib/_utils/browser', () => ({ downloadFile: vi.fn(), openInNewTab: vi.fn(), prefersMotion: () => false }))

const ada: Account = { uid: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', photo: null }

function onPhone() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: query === PHONE_SCREEN, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList,
  )
}

describe('AccountButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens a short card to sign in with Google, and fetches the sign-in code on the way', async () => {
    const user = userEvent.setup()
    const sync = await loadSync()
    vi.clearAllMocks()
    render(<AccountButton />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('dialog', { name: 'Save your progress' })).toHaveAttribute('data-slot', 'popover-content')
    expect(loadSync).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Sign in with Google' }))
    expect(sync.signIn).toHaveBeenCalledOnce()
  })

  it('waits while Google’s window is open, and says why sign-in failed', async () => {
    const user = userEvent.setup()
    render(<AccountButton />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    act(() => useAccount.setState({ status: 'signing-in' }))
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled()

    act(() => useAccount.setState({ status: 'signed-out', error: 'No connection. Try again when you are online.' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No connection.')
  })

  it('closes the card once you are signed in, and shows your photo or initial instead', async () => {
    const user = userEvent.setup()
    render(<AccountButton />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    act(() => useAccount.setState({ status: 'signed-in', account: ada }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account: Ada Lovelace' })).toHaveTextContent('A')
  })

  it('shows nothing to press while an earlier sign-in is restored', () => {
    useAccount.setState({ status: 'checking' })
    render(<AccountButton />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens the account menu: Settings, Export backup and Sign out', async () => {
    const user = userEvent.setup()
    const sync = await loadSync()
    useAccount.setState({ status: 'signed-in', account: ada })
    render(<AccountButton />)
    const open = () => user.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }))

    await open()
    expect(screen.getByRole('dialog', { name: 'Ada Lovelace' })).toHaveTextContent('ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(useUI.getState().settingsOpen).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await open()
    await user.click(screen.getByRole('button', { name: 'Export backup' }))
    expect(downloadFile).toHaveBeenCalledOnce()

    await open()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(sync.signOut).toHaveBeenCalledOnce()
    expect(useUI.getState().toast?.text).toBe('You signed out. Your progress stays on this device.')
  })

  it('falls back to the initial when the profile photo won’t load', () => {
    useAccount.setState({ status: 'signed-in', account: { ...ada, photo: 'https://example.com/ada.png' } })
    const { container } = render(<AccountButton />)
    const photo = container.querySelector('img')!
    expect(photo).toHaveAttribute('src', 'https://example.com/ada.png')

    fireEvent.error(photo)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('button', { name: 'Account: Ada Lovelace' })).toHaveTextContent('A')
  })

  it('opens as a bottom sheet on phones, with Cancel', async () => {
    onPhone()
    const user = userEvent.setup()
    render(<AccountButton />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('dialog', { name: 'Save your progress' })).toHaveAttribute('data-slot', 'sheet-content')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveFocus()
  })
})
