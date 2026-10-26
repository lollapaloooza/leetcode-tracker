import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadFile } from '@/lib/browser'
import { formatShortDay, localDate } from '@/lib/date'
import { exportable, isTrackerData, normalize } from '@/lib/persistence'
import { solvedCount } from '@/lib/planning'
import { useTracker } from '@/store'
import type { TrackerData } from '@/types'
import { Section } from './Section'

type ImportStep = { kind: 'confirm'; data: TrackerData; fileName: string } | { kind: 'error'; message: string }

function exportBackup() {
  const data = JSON.stringify(exportable(useTracker.getState()), null, 2)
  downloadFile(`leetcode-tracker-${localDate()}.json`, data, 'application/json')
}

export function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep | null>(null)
  // Keep the last step on screen while the dialog animates closed.
  const [shown, setShown] = useState<ImportStep | null>(null)
  if (step && step !== shown) setShown(step)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let raw: unknown
    try {
      raw = JSON.parse(await file.text())
    } catch {
      setStep({ kind: 'error', message: "This file isn't valid JSON. Pick a backup exported from this app." })
      return
    }
    if (!isTrackerData(raw)) {
      setStep({ kind: 'error', message: "This file doesn't look like a LeetCode Tracker backup." })
      return
    }
    setStep({ kind: 'confirm', data: normalize(raw), fileName: file.name })
  }

  const replace = () => {
    if (step?.kind === 'confirm') useTracker.getState().importData(step.data)
    setStep(null)
  }

  return (
    <Section>
      <p className="text-xs text-muted-foreground">Saved in this browser</p>
      <div className="mt-1 flex gap-4">
        <Button variant="link" size="xs" className="h-auto p-0" onClick={exportBackup}>
          Export backup
        </Button>
        <Button variant="link" size="xs" className="h-auto p-0" onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input ref={fileInput} type="file" accept="application/json" hidden onChange={onFile} />
      </div>

      <Dialog open={step !== null} onOpenChange={(open) => !open && setStep(null)}>
        <DialogContent className="sm:max-w-md">
          {shown?.kind === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>Replace your progress?</DialogTitle>
                <DialogDescription>
                  Everything saved in this browser is replaced with <span className="font-medium text-foreground">{shown.fileName}</span>.
                </DialogDescription>
              </DialogHeader>
              <BackupSummary data={shown.data} />
              <p className="text-[13px] text-muted-foreground">
                Want a copy of what you have now?{' '}
                <Button variant="link" size="xs" className="h-auto p-0 text-[13px]" onClick={exportBackup}>
                  Export it first
                </Button>
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={replace}>
                  Replace progress
                </Button>
              </DialogFooter>
            </>
          )}
          {shown?.kind === 'error' && (
            <>
              <DialogHeader>
                <DialogTitle>Can't import this file</DialogTitle>
                <DialogDescription>{shown.message}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setStep(null)}>OK</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  )
}

/** What's in the backup, so you can tell it's the right file before replacing anything. */
function BackupSummary({ data }: { data: TrackerData }) {
  const lastDay = data.attempts.reduce<string | null>((last, a) => (last === null || a.date > last ? a.date : last), null)
  const notes = Object.keys(data.notes).length
  const stats = [
    { label: 'solved', value: solvedCount(data.progress) },
    { label: data.attempts.length === 1 ? 'attempt' : 'attempts', value: data.attempts.length },
    { label: notes === 1 ? 'note' : 'notes', value: notes },
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
      <p className="mt-0.5 text-muted-foreground">{lastDay ? `Last practice ${formatShortDay(lastDay)}` : 'No attempts logged'}</p>
    </div>
  )
}
