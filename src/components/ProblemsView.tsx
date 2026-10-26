import { useMemo, useState } from 'react'
import { ChevronRightIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PROBLEMS, TOPICS, type Difficulty, type Problem, type Topic } from '@/data/problems'
import { isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { EmptyState } from './EmptyState'
import { ListRow } from './ListRow'

type DifficultyFilter = 'All' | Difficulty
const DIFFICULTY_FILTERS: DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard']

const byTopic = new Map<Topic, Problem[]>(TOPICS.map((t) => [t, PROBLEMS.filter((p) => p.topic === t)]))

export function ProblemsView({ today }: { today: string }) {
  const progress = useTracker((s) => s.progress)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('All')
  const [hideSolved, setHideSolved] = useState(false)
  const [coreOnly, setCoreOnly] = useState(false)
  // Start with the first topic that still has unsolved problems open.
  const [open, setOpen] = useState<Set<Topic>>(() => {
    const current = TOPICS.find((t) => byTopic.get(t)!.some((p) => !isSolved(progress[p.id]?.status)))
    return new Set(current ? [current] : [])
  })

  const filtering = query.trim() !== '' || difficulty !== 'All' || hideSolved || coreOnly

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TOPICS.map((topic) => {
      const all = byTopic.get(topic)!
      const visible = all.filter(
        (p) =>
          (difficulty === 'All' || p.difficulty === difficulty) &&
          (!hideSolved || !isSolved(progress[p.id]?.status)) &&
          (!coreOnly || p.core) &&
          (q === '' || p.title.toLowerCase().includes(q) || String(p.id) === q),
      )
      const solved = all.filter((p) => isSolved(progress[p.id]?.status)).length
      return { topic, visible, solved, total: all.length }
    }).filter((s) => !filtering || s.visible.length > 0)
  }, [query, difficulty, hideSolved, coreOnly, progress, filtering])

  const setTopicOpen = (topic: Topic, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (isOpen) next.add(topic)
      else next.delete(topic)
      return next
    })

  const allOpen = TOPICS.every((t) => open.has(t))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search problems or #number"
            aria-label="Search problems"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/^#/, ''))}
            className="bg-card pl-8"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={difficulty}
          onValueChange={(v) => setDifficulty((v || 'All') as DifficultyFilter)}
          aria-label="Difficulty"
          className="bg-card"
        >
          {DIFFICULTY_FILTERS.map((d) => (
            <ToggleGroupItem key={d} value={d} className="px-3 text-xs">
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
          <Switch checked={hideSolved} onCheckedChange={setHideSolved} />
          Hide solved
        </label>
        <label
          className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground"
          title="Only the core NeetCode 150"
        >
          <Switch checked={coreOnly} onCheckedChange={setCoreOnly} />
          Core 150
        </label>
        {!filtering && (
          <Button
            variant="link"
            size="sm"
            className="ml-auto h-auto p-0 max-sm:ml-0"
            onClick={() => setOpen(allOpen ? new Set() : new Set(TOPICS))}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </div>

      {sections.length === 0 && <EmptyState title="No matches">Try a different search or filter.</EmptyState>}

      <div className="flex flex-col gap-2">
        {sections.map(({ topic, visible, solved, total }) => (
          <Collapsible
            key={topic}
            open={filtering || open.has(topic)}
            onOpenChange={(isOpen) => setTopicOpen(topic, isOpen)}
            className="overflow-hidden rounded-xl bg-card ring-1 ring-border"
          >
            <CollapsibleTrigger
              disabled={filtering}
              className="group/topic flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-sm font-semibold outline-none hover:bg-muted/40 focus-visible:bg-muted/50 disabled:cursor-default max-sm:px-3"
            >
              <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/topic:rotate-90" />
              <span className="flex-1">{topic}</span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {solved}/{total}
              </span>
              <span aria-hidden className="h-1 w-16 overflow-hidden rounded-full bg-track max-sm:hidden">
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(solved / total) * 100}%` }}
                />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
              <ul className="divide-y border-t">
                {visible.map((p) => (
                  <ListRow key={p.id} problem={p} today={today} />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
