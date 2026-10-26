import { DifficultyDot } from '@/components/DifficultyTag'
import { DIFFICULTIES } from '@/lib/_consts/enums'
import { InterviewPace } from './InterviewPace'
import { Section } from './Section'
import { SolvedBar } from './SolvedBar'
import { useProgress } from './useProgress'

export function ProgressSection({ today }: { today: string }) {
  const { stats, percent, interview, pace, paceMarker } = useProgress(today)

  return (
    <Section title="Progress" action={<span className="text-[13px] text-muted-foreground">{Math.round(percent)}%</span>}>
      <p className="mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold tracking-tight">{stats.solved}</span>
        <span className="text-[13px] text-muted-foreground">/ {stats.total} solved</span>
      </p>
      <SolvedBar percent={percent} solved={stats.solved} paceMarker={paceMarker} />
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
      <div className="mt-4 border-t pt-3">
        <InterviewPace interview={interview} pace={pace} solved={stats.solved} total={stats.total} />
      </div>
    </Section>
  )
}
