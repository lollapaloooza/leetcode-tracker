import { useId, useState, type FormEvent } from 'react'
import { CalendarClockIcon, CheckIcon, HandHelpingIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { problemById } from '@/data/problems'
import { CONFIDENCE_LABEL } from '@/lib/_consts/labels'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { formatRelative } from '@/lib/_utils/date'
import { nextReview, timerElapsed } from '@/lib/domain'
import { useTracker, useUI, type LogTarget } from '@/lib/store'
import type { Confidence, Result } from '@/types'
import { DifficultyTag } from './DifficultyTag'


const RESULTS: { value: Result; label: string; icon: typeof CheckIcon }[] = [
  { value: 'solved', label: 'Solved', icon: CheckIcon },
  { value: 'helped', label: 'With help', icon: HandHelpingIcon },
  { value: 'failed', label: "Didn't solve", icon: XIcon },
]

const choiceClass =
  'h-9 flex-1 text-[13px] data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-link'

export function LogAttemptDialog({ today }: { today: string }) {
  const target = useUI((s) => s.log)
  const closeLog = useUI((s) => s.closeLog)
  // Keep the form rendered while the dialog animates closed; a fresh `n` per opening resets it.
  const [shown, setShown] = useState<{ target: LogTarget; n: number } | null>(null)
  if (target !== null && target !== shown?.target) setShown({ target, n: (shown?.n ?? 0) + 1 })

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && closeLog()}>
      <DialogContent className="sm:max-w-lg">
        {shown && <LogForm key={shown.n} target={shown.target} today={today} onDone={closeLog} />}
      </DialogContent>
    </Dialog>
  )
}

function LogForm({ target, today, onDone }: { target: LogTarget; today: string; onDone: () => void }) {
  const problem = problemById.get(target.id)!
  const targetMinutes = TARGET_MINUTES[problem.difficulty]
  const ids = { minutes: useId(), note: useId(), time: useId() }

  // Snapshot the store once: the timer keeps ticking, but the form shouldn't jump around.
  const [initial] = useState(() => {
    const s = useTracker.getState()
    const editing = target.editKey ? s.attempts.find((a) => a.key === target.editKey) : undefined
    const timerMs = s.timer?.id === target.id ? timerElapsed(s.timer, Date.now()) : null
    const seconds = editing ? editing.seconds : timerMs !== null ? Math.round(timerMs / 1000) : null
    return {
      editing,
      seconds,
      minutes: seconds !== null ? String(Math.max(1, Math.round(seconds / 60))) : '',
      result: editing?.result ?? ('solved' as Result),
      confidence: editing?.confidence ?? (2 as Confidence),
      note: s.notes[target.id] ?? '',
      time: s.complexity[target.id]?.time ?? '',
      space: s.complexity[target.id]?.space ?? '',
      // Preview the schedule from the state before this attempt when editing.
      baseReview: editing ? editing.prev.review : s.reviews[target.id],
    }
  })

  const [result, setResult] = useState<Result>(initial.result)
  const [confidence, setConfidence] = useState<Confidence>(initial.confidence)
  const [minutes, setMinutes] = useState(initial.minutes)
  const [note, setNote] = useState(initial.note)
  const [time, setTime] = useState(initial.time)
  const [space, setSpace] = useState(initial.space)

  const minutesValue = minutes.trim() === '' ? null : Number(minutes)
  const overBy = minutesValue !== null ? Math.round(minutesValue - targetMinutes) : 0
  const next = nextReview(initial.baseReview, result, confidence, today)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Keep the timer's exact seconds unless the minutes were edited by hand.
    const seconds =
      minutes === initial.minutes ? initial.seconds : minutesValue === null ? null : Math.round(minutesValue * 60)
    const { undoAttempt, logAttempt } = useTracker.getState()
    if (initial.editing) undoAttempt(initial.editing.key)
    logAttempt(target.id, { seconds, result, confidence, note, time, space }, today)
    onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{initial.editing ? 'Edit attempt' : 'Log attempt'}</DialogTitle>
        <DialogDescription className="flex items-center gap-2">
          <span className="truncate">{problem.title}</span>
          <DifficultyTag difficulty={problem.difficulty} />
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium">Result</legend>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={result}
          onValueChange={(v) => v && setResult(v as Result)}
          className="w-full"
        >
          {RESULTS.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className={choiceClass}>
              <Icon />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>

      {result === 'solved' && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-medium">How confident would you be in an interview?</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={String(confidence)}
            onValueChange={(v) => v && setConfidence(Number(v) as Confidence)}
            className="w-full"
          >
            {([1, 2, 3] as Confidence[]).map((c) => (
              <ToggleGroupItem key={c} value={String(c)} className={choiceClass}>
                {CONFIDENCE_LABEL[c]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div className="grid gap-2">
          <label htmlFor={ids.minutes} className="text-[13px] font-medium">
            Minutes
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={ids.minutes}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="—"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16"
            />
            <span className="text-[13px] whitespace-nowrap text-muted-foreground">
              target {targetMinutes}
              {overBy > 0 && <span className="text-attempted-foreground"> · {overBy} over</span>}
            </span>
          </div>
        </div>
        {/* Interviewers always ask for complexity — writing it down builds the habit. */}
        <div className="grid gap-2">
          <label htmlFor={ids.time} className="text-[13px] font-medium">
            Complexity
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={ids.time}
              aria-label="Time complexity"
              placeholder="O(n)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full min-w-0 font-mono text-[13px] md:text-[13px]"
            />
            <span className="text-xs text-muted-foreground">time</span>
            <Input
              aria-label="Space complexity"
              placeholder="O(1)"
              value={space}
              onChange={(e) => setSpace(e.target.value)}
              className="w-full min-w-0 font-mono text-[13px] md:text-[13px]"
            />
            <span className="text-xs text-muted-foreground">space</span>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor={ids.note} className="text-[13px] font-medium">
          Key idea <span className="font-normal text-muted-foreground">— shows up in Patterns</span>
        </label>
        <Textarea
          id={ids.note}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit()
          }}
          placeholder="The trick in one line, e.g. “sort, then two pointers; skip duplicates”"
        />
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <CalendarClockIcon className="size-3.5" />
          {next.due ? `Next review ${formatRelative(next.due, today)}` : 'Mastered — no more reviews'}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </DialogFooter>
    </form>
  )
}
