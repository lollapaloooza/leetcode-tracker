import { useId, type ReactNode } from 'react'

/** One sidebar card: a small heading with an optional action, then its content. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
