import { CheckIcon } from 'lucide-react'
import type { Problem } from '@/data/problems'
import { useUI } from '@/lib/store'

/** The empty circle at the start of an unfinished row: click it to log the attempt. */
export function LogCircle({ problem }: { problem: Problem }) {
  const openLog = useUI((s) => s.openLog)
  return (
    <button
      type="button"
      aria-label={`Log attempt for ${problem.title}`}
      title="Log attempt"
      onClick={() => openLog({ id: problem.id })}
      className="group/done grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-5 place-items-center rounded-full border-2 border-border transition-colors group-hover/done:border-success">
        <CheckIcon className="size-3 text-success opacity-0 transition-opacity group-hover/done:opacity-70" strokeWidth={3.5} />
      </span>
    </button>
  )
}
