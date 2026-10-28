import { useId } from 'react'
import { CircleUserRoundIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AccountAvatar } from './AccountAvatar'
import { AccountMenu } from './AccountMenu'
import { SignInCard } from './SignInCard'
import { useAccountButton } from './useAccountButton'

/** The last button in the header: a person icon to sign in, then your photo, which opens the account menu. */
export function AccountButton() {
  const account = useAccountButton()
  const titleId = useId()

  // An earlier sign-in is being restored: hold the place, so the icon doesn't show "Sign in" first.
  if (account.status === 'checking') return <span aria-hidden className="size-7 animate-pulse rounded-full bg-muted max-sm:size-9" />

  const signedIn = account.account
  const name = signedIn ? (signedIn.name ?? signedIn.email ?? 'Google account') : ''
  const trigger = signedIn ? (
    <Button
      variant="ghost"
      size="icon-sm"
      // The same size as the header's other buttons; the photo fills it, with no border taking room.
      className="overflow-hidden rounded-full border-0 p-0 data-[state=open]:ring-3 data-[state=open]:ring-ring/50 max-sm:size-9"
      aria-label={`Account: ${name}`}
      title={name}
    >
      <AccountAvatar account={signedIn} className="size-full text-sm" />
    </Button>
  ) : (
    <Button variant="outline" size="icon-sm" className="rounded-full text-muted-foreground max-sm:size-9" aria-label="Sign in" title="Sign in">
      <CircleUserRoundIcon />
    </Button>
  )

  const panel = (Title: typeof SheetTitle | 'h2', id?: string) =>
    signedIn ? (
      <AccountMenu
        account={signedIn}
        onSettings={account.openSettings}
        onExport={account.exportBackup}
        onSignOut={account.signOut}
        Title={Title}
        titleId={id}
      />
    ) : (
      <SignInCard
        status={account.status}
        error={account.error}
        onSignIn={account.signIn}
        onCancel={account.phone ? account.close : undefined}
        Title={Title}
        titleId={id}
      />
    )

  if (account.phone) {
    return (
      <Sheet open={account.open} onOpenChange={account.setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="mx-auto w-full max-w-lg gap-0 rounded-t-2xl border-x px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-[signed-in]:px-3"
          data-signed-in={signedIn ? '' : undefined}
        >
          <span aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
          {panel(SheetTitle)}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={account.open} onOpenChange={account.setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-labelledby={titleId} className={signedIn ? 'w-72 gap-0 p-1.5' : 'w-80 gap-0 p-5'}>
        {panel('h2', titleId)}
      </PopoverContent>
    </Popover>
  )
}
