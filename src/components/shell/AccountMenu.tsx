import type { ElementType, ReactNode } from 'react'
import { DownloadIcon, LogOutIcon, Settings2Icon } from 'lucide-react'
import { cn } from '@/lib/_utils/cn'
import type { Account } from '@/lib/store'
import { AccountAvatar } from './AccountAvatar'

interface AccountMenuProps {
  account: Account
  onSettings: () => void
  onExport: () => void
  onSignOut: () => void
  /** The element for the name: `SheetTitle` in a sheet, so the sheet is named by it. */
  Title: ElementType
  titleId?: string
}

/** Who's signed in, and the few things to do from here. */
export function AccountMenu({ account, onSettings, onExport, onSignOut, Title, titleId }: AccountMenuProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
        <AccountAvatar account={account} className="size-10 text-base" />
        <div className="min-w-0">
          <Title {...(titleId && { id: titleId })} className="truncate text-sm font-semibold">
            {account.name ?? 'Google account'}
          </Title>
          {account.email && <p className="truncate text-xs text-muted-foreground">{account.email}</p>}
        </div>
      </div>
      <hr className="mb-1.5" />
      <MenuItem icon={<Settings2Icon />} onClick={onSettings}>
        Settings
      </MenuItem>
      <MenuItem icon={<DownloadIcon />} onClick={onExport}>
        Export backup
      </MenuItem>
      <hr className="my-1.5" />
      <MenuItem icon={<LogOutIcon />} onClick={onSignOut} danger>
        Sign out
      </MenuItem>
    </div>
  )
}

function MenuItem({ icon, onClick, danger, children }: { icon: ReactNode; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted max-sm:h-12 max-sm:text-[15px] [&_svg]:size-4 [&_svg]:text-muted-foreground max-sm:[&_svg]:size-5',
        danger && 'text-destructive hover:bg-destructive/10 [&_svg]:text-current',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
