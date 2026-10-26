import { Suspense } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { lazyComponent } from '@/lib/_utils/lazy'

// Not needed for the first screen: loads in its own chunk, in the background after startup.
const HistoryView = lazyComponent(() => import('@/components/HistoryView').then((m) => m.HistoryView))

/** The History tab. Below `lg` there's no sidebar, so its progress cards come first and the tab is called Progress. */
export function ProgressTab({ today, withCards }: { today: string; withCards: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      {withCards && <Sidebar today={today} />}
      <Suspense fallback={null}>
        <HistoryView today={today} />
      </Suspense>
    </div>
  )
}
