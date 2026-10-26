import type { ReactNode } from 'react'

/** One sidebar block: a small heading with an optional action, then its content. */
export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b py-5 first:pt-0 last:border-b-0 sm:max-lg:[&:nth-child(-n+2)]:pt-0">
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
