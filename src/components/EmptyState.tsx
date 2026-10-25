import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-5 py-11 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <div className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{children}</div>
    </div>
  )
}
