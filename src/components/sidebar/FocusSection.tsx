import { useMemo, useState } from 'react'
import { CheckIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { problemById } from '@/data/problems'
import { weakTopics } from '@/lib/insights'
import { nextInTopic, plannedFrom } from '@/lib/planning'
import { useTracker } from '@/store'
import type { Topic } from '@/types'
import { Section } from './Section'

const FOCUS_WINDOW_DAYS = 60

/** Weakest topics from recent attempts, each with the reason and a one-click way to practice it. */
export function FocusSection({ today }: { today: string }) {
  const attempts = useTracker((s) => s.attempts)
  const [added, setAdded] = useState<Topic | null>(null)
  const focus = useMemo(() => weakTopics(attempts, problemById, today, { days: FOCUS_WINDOW_DAYS }), [attempts, today])

  const practice = (topic: Topic) => {
    const s = useTracker.getState()
    const id = nextInTopic(s, topic, plannedFrom(s.plans, today), today)
    if (id === null) return
    s.addToPlan([id], today)
    setAdded(topic)
    setTimeout(() => setAdded((t) => (t === topic ? null : t)), 1500)
  }

  return (
    <Section title="Focus" action={<span className="text-xs text-muted-foreground">last {FOCUS_WINDOW_DAYS} days</span>}>
      {focus.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {attempts.length < 3
            ? 'Log a few attempts and the topics that trip you up show here.'
            : 'No weak spots right now — nice.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {focus.map((f) => (
            <li key={f.topic} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{f.topic}</p>
                <p className="text-xs text-muted-foreground">{f.reason}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={`Add a ${f.topic} problem to today`}
                title="Add one to today"
                onClick={() => practice(f.topic)}
              >
                {added === f.topic ? <CheckIcon className="text-success-foreground" /> : <PlusIcon />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
