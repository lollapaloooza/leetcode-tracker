import { DifficultyDot } from '@/components/DifficultyTag'
import { Progress } from '@/components/ui/progress'
import { DIFFICULTIES } from '@/lib/_consts/enums'
import { computePace } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { Section } from './Section'
import { useSolvedStats } from './use-solved-stats'

export function ProgressSection({ today }: { today: string }) {
  const stats = useSolvedStats()
  const interview = useTracker((s) => s.interview)
  const pct = (stats.solved / stats.total) * 100
  const pace = interview ? computePace(interview, stats.solved, stats.total, today) : null
  const showMarker = pace && pace.daysLeft > 0 && pace.expected > 0

  return (
    <Section title="Progress" action={<span className="text-[13px] text-muted-foreground">{Math.round(pct)}%</span>}>
      <p className="mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold tracking-tight">{stats.solved}</span>
        <span className="text-[13px] text-muted-foreground">/ {stats.total} solved</span>
      </p>
      <div className="relative">
        <Progress
          aria-label="Overall progress"
          // Keep a sliver visible after the first solve so the bar never looks empty.
          value={stats.solved > 0 ? Math.max(pct, 2) : 0}
          className="h-2 bg-track"
          indicatorClassName="rounded-full bg-linear-to-r from-primary/60 to-primary duration-700 ease-out animate-[progress-in_1.1s_ease-out]"
        />
        {showMarker && (
          // Pace marker: where a steady pace would put you today.
          <span
            aria-hidden
            title={`On pace: ${pace.expected} solved by today`}
            className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/55 transition-[left] duration-700"
            style={{ left: `${(pace.expected / stats.total) * 100}%` }}
          />
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-[13px]">
        {DIFFICULTIES.map((d) => (
          <li key={d} className="flex items-center gap-2 text-muted-foreground">
            <DifficultyDot difficulty={d} />
            <span className="flex-1">{d}</span>
            <span className="tabular-nums">
              <span className="font-medium text-foreground">{stats.byDifficulty[d].solved}</span> / {stats.byDifficulty[d].total}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
