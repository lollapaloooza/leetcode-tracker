import { useState } from 'react'
import { exportBackup } from '@/components/settings/useBackup'
import { PHONE_SCREEN } from '@/lib/_consts/layout'
import { useMediaQuery } from '@/lib/_hooks/useMediaQuery'
import { useAccount, useUI } from '@/lib/store'
import { loadSync, withSync } from '@/lib/sync/load'

/** The account button: a card to sign in, or the account menu. A popover, or a bottom sheet on phones. */
export function useAccountButton() {
  const status = useAccount((s) => s.status)
  const account = useAccount((s) => s.account)
  const error = useAccount((s) => s.error)
  const phone = useMediaQuery(PHONE_SCREEN)
  // Which account the panel was opened for (null: signed out). Signing in or out closes it.
  const [openFor, setOpenFor] = useState<string | null | undefined>(undefined)
  const uid = account?.uid ?? null

  const setOpen = (open: boolean) => {
    // Fetch the sign-in code now, so "Sign in with Google" opens Google's window at once.
    if (open && !account) loadSync().catch(() => {})
    if (!open) useAccount.setState({ error: null })
    setOpenFor(open ? uid : undefined)
  }
  const close = () => setOpen(false)

  return {
    status,
    account,
    error,
    phone,
    open: openFor === uid,
    setOpen,
    close,
    signIn: () => withSync((sync) => sync.signIn()),
    openSettings: () => {
      close()
      useUI.getState().setSettingsOpen(true)
    },
    exportBackup: () => {
      close()
      exportBackup()
    },
    signOut: () => {
      close()
      withSync((sync) => sync.signOut())
      useUI.getState().showToast({ text: 'You signed out. Your progress stays on this device.' })
    },
  }
}
