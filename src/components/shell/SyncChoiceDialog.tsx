import type { ReactNode } from 'react'
import { CloudIcon, MonitorSmartphoneIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatShortDay } from '@/lib/_utils/date'
import { summarizeBackup } from '@/lib/store'
import type { TrackerData } from '@/types'
import { useSyncChoice } from './useSyncChoice'

/** First sign-in on a device whose progress differs from the cloud's: keep one of the two. */
export function SyncChoiceDialog() {
  const sync = useSyncChoice()
  return (
    <Dialog open={sync.open} onOpenChange={(open) => !open && sync.later()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select the progress to keep</DialogTitle>
          <DialogDescription>This device and the cloud have different progress. The app replaces the other one.</DialogDescription>
        </DialogHeader>
        {sync.sides && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Side icon={<CloudIcon />} label="Cloud" data={sync.sides.cloud} onPick={() => sync.choose('cloud')} />
            <Side icon={<MonitorSmartphoneIcon />} label="This device" data={sync.sides.device} onPick={() => sync.choose('device')} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Side({ icon, label, data, onPick }: { icon: ReactNode; label: string; data: TrackerData; onPick: () => void }) {
  const { solved, attempts, lastPractice } = summarizeBackup(data)
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-col items-start gap-1 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:p-4"
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-[13px] text-muted-foreground">
        {solved} solved · {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
      </span>
      <span className="text-xs text-muted-foreground">{lastPractice ? `Last practice ${formatShortDay(lastPractice)}` : 'No attempts'}</span>
    </button>
  )
}
