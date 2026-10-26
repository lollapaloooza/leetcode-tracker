import { useId, type ReactNode } from 'react'

/** A group of settings under a small heading. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="border-t py-5 first:border-t-0 first:pt-3">
      <h3 id={headingId} className="mb-1 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col divide-y divide-border/60">{children}</div>
    </section>
  )
}

/** One setting: what it is, an optional line on what it does, and its control on the right. */
export function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}
