import { LogAttemptDialog } from '@/components/LogAttemptDialog'
import { lazyComponent } from '@/lib/_utils/lazy'
import { useUI } from '@/lib/store'
import { MountWhenOpened } from './MountWhenOpened'
import { usePaletteShortcut } from './usePaletteShortcut'

// Not needed for the first screen: each loads in its own chunk, in the background after startup.
const CommandPalette = lazyComponent(() => import('@/components/command-palette/CommandPalette').then((m) => m.CommandPalette))
const ProblemSheet = lazyComponent(() => import('@/components/ProblemSheet').then((m) => m.ProblemSheet))
const PythonSheet = lazyComponent(() => import('@/components/PythonSheet').then((m) => m.PythonSheet))
const ShortOnTimeDialog = lazyComponent(() => import('@/components/ShortOnTimeDialog').then((m) => m.ShortOnTimeDialog))
const CalendarDialog = lazyComponent(() => import('@/components/CalendarDialog').then((m) => m.CalendarDialog))
const SettingsSheet = lazyComponent(() => import('@/components/settings/SettingsSheet').then((m) => m.SettingsSheet))

/** Dialogs and drawers. Each lazy one mounts the first time it opens, so its code loads only when needed. */
export function Overlays({ today }: { today: string }) {
  const paletteOpen = useUI((s) => s.paletteOpen)
  const detailOpen = useUI((s) => s.detailFor !== null)
  const pythonOpen = useUI((s) => s.pythonOpen)
  const shortOnTimeOpen = useUI((s) => s.shortOnTimeOpen)
  const calendarOpen = useUI((s) => s.calendarOpen)
  const settingsOpen = useUI((s) => s.settingsOpen)
  usePaletteShortcut()

  return (
    <>
      <LogAttemptDialog today={today} />
      <MountWhenOpened open={paletteOpen}>
        <CommandPalette today={today} />
      </MountWhenOpened>
      <MountWhenOpened open={detailOpen}>
        <ProblemSheet today={today} />
      </MountWhenOpened>
      <MountWhenOpened open={pythonOpen}>
        <PythonSheet />
      </MountWhenOpened>
      <MountWhenOpened open={shortOnTimeOpen}>
        <ShortOnTimeDialog today={today} />
      </MountWhenOpened>
      <MountWhenOpened open={settingsOpen}>
        <SettingsSheet today={today} />
      </MountWhenOpened>
      {/* After Settings, so the calendar dialog it opens stacks on top. */}
      <MountWhenOpened open={calendarOpen}>
        <CalendarDialog />
      </MountWhenOpened>
    </>
  )
}
