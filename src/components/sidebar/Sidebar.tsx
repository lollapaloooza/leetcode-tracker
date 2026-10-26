import { Settings2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/store'
import { FocusSection } from './FocusSection'
import { ProgressSection } from './ProgressSection'
import { ThisWeekSection } from './ThisWeekSection'

/**
 * What changes day to day: beside the main column on wide screens, atop the Progress tab below `lg`
 * (two columns on tablets). Settings you rarely touch live in the Settings sheet.
 */
export function Sidebar({ today }: { today: string }) {
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)
  return (
    <div className="flex flex-col gap-4 sm:max-lg:grid sm:max-lg:grid-cols-2">
      <ProgressSection today={today} />
      <ThisWeekSection today={today} />
      <FocusSection today={today} />
      <Button variant="ghost" size="sm" className="justify-start self-start text-muted-foreground sm:max-lg:col-span-2" onClick={() => setSettingsOpen(true)}>
        <Settings2Icon />
        Routine, interview date and backup
      </Button>
    </div>
  )
}
