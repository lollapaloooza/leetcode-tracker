import type { ReactNode } from 'react'

/** A one-line nudge with its action on the right. */
export function Notice({ icon, action, children }: { icon?: ReactNode; action: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/8 px-4 py-2.5 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      {action}
    </div>
  )
}
