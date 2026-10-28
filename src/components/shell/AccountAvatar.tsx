import { useState } from 'react'
import { cn } from '@/lib/_utils/cn'
import type { Account } from '@/lib/store'

/** The Google profile photo, or the first letter of the name when there's none or it won't load. */
export function AccountAvatar({ account, className }: { account: Account; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null)
  if (account.photo && account.photo !== broken) {
    // Google's photo links can fail when the request carries a referrer.
    const photo = account.photo
    // max-w-none: the page's base styles cap images at their container's width, which squeezes the circle.
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(photo)}
        className={cn('max-w-none shrink-0 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary', className)}>
      {(account.name ?? account.email ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}
