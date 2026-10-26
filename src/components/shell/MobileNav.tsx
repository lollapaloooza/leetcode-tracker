import { useUI } from '@/lib/store'
import { NAV_TABS } from './nav-tabs'

/** Phones: the tabs as a bar at the bottom, within reach of a thumb. Drives the same tab as the header. */
export function MobileNav() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)

  return (
    <nav aria-label="Main" className="grid grid-cols-4 gap-1 border-t bg-background px-2 pt-1.5 pb-2">
      {NAV_TABS.map(({ value, label, icon, narrow }) => {
        const Icon = narrow?.icon ?? icon
        return (
          <button
            key={value}
            type="button"
            aria-current={tab === value ? 'page' : undefined}
            className="group/tab flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
            onClick={() => setTab(value)}
          >
            <Icon aria-hidden className="size-5.5 group-aria-[current=page]/tab:text-link" />
            {narrow?.label ?? label}
          </button>
        )
      })}
    </nav>
  )
}
