import { useEffect } from 'react'
import { useAccount } from '@/lib/store'
import { loadSync, withSync } from '@/lib/sync/load'

/** The account row in Settings: who's signed in, and signing in or out. */
export function useAccountRow() {
  const status = useAccount((s) => s.status)
  const account = useAccount((s) => s.account)
  const error = useAccount((s) => s.error)

  // Fetch the sign-in code while Settings is open, so Sign in opens Google's popup straight away.
  useEffect(() => {
    loadSync().catch(() => {})
  }, [])

  return {
    status,
    account,
    error,
    signIn: () => withSync((sync) => sync.signIn()),
    signOut: () => withSync((sync) => sync.signOut()),
  }
}
