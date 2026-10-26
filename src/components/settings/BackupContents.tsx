import { formatShortDay } from '@/lib/_utils/date'
import { summarizeBackup } from '@/lib/store'
import type { TrackerData } from '@/types'

const count = (n: number, one: string, many: string) => ({ value: n, label: n === 1 ? one : many })

/** What's in a backup, so you can tell it's the right file before replacing anything. */
export function BackupContents({ data }: { data: TrackerData }) {
  const summary = summarizeBackup(data)
  const stats = [
    count(summary.solved, 'solved', 'solved'),
    count(summary.attempts, 'attempt', 'attempts'),
    count(summary.notes, 'note', 'notes'),
  ]
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-[13px]">
      <p className="flex flex-wrap gap-x-3">
        {stats.map((s) => (
          <span key={s.label}>
            <span className="font-semibold tabular-nums">{s.value}</span> <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {summary.lastPractice ? `Last practice ${formatShortDay(summary.lastPractice)}` : 'No attempts logged'}
      </p>
    </div>
  )
}
