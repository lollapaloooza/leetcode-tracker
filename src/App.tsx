import { Suspense, useEffect } from 'react'
import { ProblemsView } from '@/components/ProblemsView'
import { DocumentTitle } from '@/components/shell/DocumentTitle'
import { MobileNav } from '@/components/shell/MobileNav'
import { NowBar } from '@/components/shell/NowBar'
import { Overlays } from '@/components/shell/Overlays'
import { ProgressTab } from '@/components/shell/ProgressTab'
import { TopBar } from '@/components/shell/TopBar'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { TodayView } from '@/components/today/TodayView'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { WIDE_SCREEN } from '@/lib/_consts/layout'
import { useMediaQuery } from '@/lib/_hooks/useMediaQuery'
import { useToday } from '@/lib/_hooks/useToday'
import { lazyComponent, preloadLazyComponents } from '@/lib/_utils/lazy'
import { useUI, type Tab } from '@/lib/store'
import { resumeSync } from '@/lib/sync/load'

// Not needed for the first screen: loads in its own chunk, in the background after startup.
const PatternsView = lazyComponent(() => import('@/components/PatternsView').then((m) => m.PatternsView))

export default function App() {
  const today = useToday()
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const wide = useMediaQuery(WIDE_SCREEN)

  useEffect(preloadLazyComponents, [])
  useEffect(resumeSync, [])

  return (
    // The tabs span the page: their list is in the header, their panels in the main column.
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-h-svh flex-col gap-0">
      <DocumentTitle />
      <TopBar today={today} />

      {/* Tasks get the main column. Progress lives in a quiet sidebar on wide screens, and in its own tab below lg. */}
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-10 px-5 pt-5 pb-14 max-sm:px-4 max-sm:pb-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0">
          <TabsContent value="today">
            <TodayView today={today} />
          </TabsContent>
          <TabsContent value="all">
            <ProblemsView today={today} />
          </TabsContent>
          <TabsContent value="patterns">
            <Suspense fallback={null}>
              <PatternsView />
            </Suspense>
          </TabsContent>
          <TabsContent value="history">
            <ProgressTab today={today} withCards={!wide} />
          </TabsContent>
        </main>

        {wide && (
          <aside aria-label="Progress" className="sticky top-20 self-start pt-1">
            <Sidebar today={today} />
          </aside>
        )}
      </div>

      {/* Phones: the tab bar, with the problem on the clock above it. Sticky, so it never covers the end of the page. */}
      <div className="sticky bottom-0 z-40 sm:hidden">
        <NowBar today={today} />
        <MobileNav />
      </div>

      <Overlays today={today} />
    </Tabs>
  )
}
