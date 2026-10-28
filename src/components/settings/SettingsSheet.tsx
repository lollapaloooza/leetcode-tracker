import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUI } from '@/lib/store'
import { AppearanceSettings } from './AppearanceSettings'
import { BackupSettings } from './BackupSettings'
import { InterviewSettings } from './InterviewSettings'
import { RoutineSettings } from './RoutineSettings'
import { StartSettings } from './StartSettings'

/** What you set once and rarely touch, kept out of the daily view. */
export function SettingsSheet({ today }: { today: string }) {
  const open = useUI((s) => s.settingsOpen)
  const setOpen = useUI((s) => s.setSettingsOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Full width on phones; the side variants override plain `w-*` / `max-w-*`, hence the prefixes. */}
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">Your routine, interview date, what Start opens, theme, account and backups</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <RoutineSettings />
          <InterviewSettings today={today} />
          <StartSettings />
          <AppearanceSettings />
          <BackupSettings />
        </div>
      </SheetContent>
    </Sheet>
  )
}
