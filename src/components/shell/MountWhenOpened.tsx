import { Suspense, useState, type ReactNode } from 'react'

/** Renders its children from the first time `open` is true, and keeps them, so closing still animates. */
export function MountWhenOpened({ open, children }: { open: boolean; children: ReactNode }) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)
  return opened ? <Suspense fallback={null}>{children}</Suspense> : null
}
