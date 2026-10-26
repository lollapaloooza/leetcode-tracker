import { useMemo, useState } from 'react'
import { CheckIcon, CopyIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PROBLEMS, TOPICS, type Problem } from '@/data/problems'
import { useTracker } from '@/lib/store'
import { DifficultyDot } from './DifficultyTag'
import { EmptyState } from './EmptyState'
import { ComplexityTags, ProblemLinks, ProblemTitle } from './problem-bits'

export function PatternsView() {
  const notes = useTracker((s) => s.notes)
  const complexity = useTracker((s) => s.complexity)
  const [copied, setCopied] = useState(false)

  const groups = useMemo(
    () =>
      TOPICS.map((topic) => ({
        topic,
        items: PROBLEMS.filter((p) => p.topic === topic && notes[p.id]).map((p) => ({ problem: p, note: notes[p.id] })),
      })).filter((g) => g.items.length > 0),
    [notes],
  )
  const count = groups.reduce((n, g) => n + g.items.length, 0)

  const copyMarkdown = async () => {
    const md = [
      '# LeetCode patterns',
      ...groups.flatMap((g) => [
        '',
        `## ${g.topic}`,
        ...g.items.map(({ problem, note }) => {
          const c = complexity[problem.id]
          const big = [c?.time && `${c.time} time`, c?.space && `${c.space} space`].filter(Boolean).join(', ')
          return `- **${problem.title}** (${problem.difficulty}) — ${note}${big ? ` _(${big})_` : ''}`
        }),
      ]),
    ].join('\n')
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (count === 0) {
    return (
      <EmptyState title="No patterns yet">
        When you log an attempt, write the key idea in one line. They collect here by topic, ready to skim before an
        interview.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {count} {count === 1 ? 'pattern' : 'patterns'} across {groups.length} {groups.length === 1 ? 'topic' : 'topics'}
        </p>
        <Button variant="outline" size="sm" onClick={copyMarkdown}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy as Markdown'}
        </Button>
      </div>
      {groups.map(({ topic, items }) => (
        <section key={topic} className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          <h3 className="border-b px-4 py-3 text-sm font-semibold max-sm:px-3">{topic}</h3>
          <ul className="divide-y">
            {items.map(({ problem, note }) => (
              <PatternRow key={problem.id} problem={problem} note={note} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function PatternRow({ problem, note }: { problem: Problem; note: string }) {
  const setNote = useTracker((s) => s.setNote)
  const complexity = useTracker((s) => s.complexity[problem.id])
  const [draft, setDraft] = useState<string | null>(null)

  const save = () => {
    if (draft !== null) setNote(problem.id, draft)
    setDraft(null)
  }

  return (
    <li className="group/pattern flex flex-col gap-1.5 px-4 py-3 max-sm:px-3">
      <div className="flex items-center gap-2">
        <DifficultyDot difficulty={problem.difficulty} />
        <ProblemTitle problem={problem} className="flex-1 text-[13px] font-medium" />
        <ProblemLinks problem={problem} />
        {draft === null && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={`Edit key idea for ${problem.title}`}
            onClick={() => setDraft(note)}
          >
            <PencilIcon />
          </Button>
        )}
      </div>
      {draft === null ? (
        <div className="flex flex-col gap-2 pl-4">
          <p className="text-sm whitespace-pre-wrap">{note}</p>
          <ComplexityTags complexity={complexity} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 pl-4">
          <Textarea
            autoFocus
            rows={2}
            value={draft}
            aria-label={`Key idea for ${problem.title}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
              if (e.key === 'Escape') setDraft(null)
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
