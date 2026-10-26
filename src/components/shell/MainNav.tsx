import { TabsList } from '@/components/ui/tabs'
import { cn } from '@/lib/_utils/cn'
import { useTracker, type Tab } from '@/lib/store'
import { NAV_TABS } from './nav-tabs'
import { NavTab } from './NavTab'

/** The tabs in the header, with what's planned today and how many patterns have notes. */
export function MainNav({ today, className }: { today: string; className?: string }) {
  const planned = useTracker((s) => s.plans[today]?.length ?? 0)
  const notes = useTracker((s) => Object.keys(s.notes).length)
  const counts: Partial<Record<Tab, number>> = { today: planned, patterns: notes }

  return (
    <TabsList
      variant="line"
      className={cn('justify-start gap-5 p-0 group-data-horizontal/tabs:h-11 lg:group-data-horizontal/tabs:h-14', className)}
    >
      {NAV_TABS.map((tab) => (
        <NavTab key={tab.value} tab={tab} count={counts[tab.value]} />
      ))}
    </TabsList>
  )
}
