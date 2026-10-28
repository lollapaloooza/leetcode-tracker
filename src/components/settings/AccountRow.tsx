import { useState } from 'react'
import { LoaderCircleIcon, LogInIcon, LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Account } from '@/lib/store'
import { useAccountRow } from './useAccountRow'

/** Sign in with Google. Sync comes next (ADR-002); for now signing in only links the account. */
export function AccountRow() {
  const row = useAccountRow()

  if (row.account) {
    return (
      <div className="flex min-h-13 items-center gap-3 py-2">
        <Avatar account={row.account} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.account.name ?? 'Google account'}</p>
          <p className="truncate text-xs text-muted-foreground">{row.account.email}</p>
        </div>
        <Button variant="ghost" className="shrink-0" onClick={row.signOut}>
          <LogOutIcon />
          Sign out
        </Button>
      </div>
    )
  }

  const busy = row.status === 'signing-in'
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Google account</p>
          <p className="text-xs text-muted-foreground">
            {row.status === 'checking' ? 'Checking your sign-in…' : 'Sign in now. Syncing between devices comes next.'}
          </p>
        </div>
        {row.status !== 'checking' && (
          <Button variant="outline" className="shrink-0" disabled={busy} onClick={row.signIn}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : <LogInIcon />}
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        )}
      </div>
      {row.error && (
        <p role="alert" className="text-xs text-destructive">
          {row.error}
        </p>
      )}
    </div>
  )
}

/** The Google profile photo, or the first letter of the name when there's none or it won't load. */
function Avatar({ account }: { account: Account }) {
  const [broken, setBroken] = useState(false)
  if (account.photo && !broken) {
    // Google's photo links can fail when the request carries a referrer.
    return <img src={account.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-8 shrink-0 rounded-full" />
  }
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {(account.name ?? account.email ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}
