import { Progress } from '@/components/ui/progress'

interface SolvedBarProps {
  percent: number
  solved: number
  /** Where a steady pace would put you by today (% of the bar), or null for no marker */
  paceMarker: number | null
}

export function SolvedBar({ percent, solved, paceMarker }: SolvedBarProps) {
  return (
    <div className="relative">
      <Progress
        aria-label="Overall progress"
        // Keep a sliver visible after the first solve so the bar never looks empty.
        value={solved > 0 ? Math.max(percent, 2) : 0}
        className="h-2 bg-track"
        indicatorClassName="rounded-full bg-linear-to-r from-primary/60 to-primary duration-700 ease-out animate-[progress-in_1.1s_ease-out]"
      />
      {paceMarker !== null && (
        <span
          aria-hidden
          title="Where a steady pace would put you today"
          className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/55 transition-[left] duration-700"
          style={{ left: `${paceMarker}%` }}
        />
      )}
    </div>
  )
}
