import { useMemo, useState, type ReactNode } from 'react'
import { CheckIcon, CopyIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PYTHON_CHEATSHEET, type Snippet } from '@/data/python-cheatsheet'
import { useUI } from '@/lib/store'
import { PythonIcon } from './PythonIcon'

export function PythonSheet() {
  const open = useUI((s) => s.pythonOpen)
  const setOpen = useUI((s) => s.setPythonOpen)
  const [query, setQuery] = useState('')

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PYTHON_CHEATSHEET
    return PYTHON_CHEATSHEET.map((section) => ({
      ...section,
      snippets: section.title.toLowerCase().includes(q)
        ? section.snippets
        : section.snippets.filter((s) =>
            [s.title, s.code, s.js, s.note].some((text) => text?.toLowerCase().includes(q)),
          ),
    })).filter((section) => section.snippets.length > 0)
  }, [query])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="gap-3 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <PythonIcon width={22} height={22} />
            <div>
              <SheetTitle>Python for LeetCode</SheetTitle>
              <SheetDescription className="text-xs">
                What you'll actually use — with the <span className="font-medium">JS</span> you already know.
              </SheetDescription>
            </div>
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search: heap, deque, slice, sort…"
              aria-label="Search the Python cheatsheet"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {!query && (
            <nav aria-label="Sections" className="-mx-1 flex flex-wrap gap-1">
              {PYTHON_CHEATSHEET.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => document.getElementById(`py-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {s.title}
                </Button>
              ))}
            </nav>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10">
          {sections.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches “{query}”.</p>
          )}
          {sections.map((section) => (
            <section key={section.id} id={`py-${section.id}`} className="scroll-mt-2 pt-4">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{section.title}</h3>
              <div className="flex flex-col gap-3">
                {section.snippets.map((snippet) => (
                  <SnippetCard key={snippet.title} snippet={snippet} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SnippetCard({ snippet }: { snippet: Snippet }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(snippet.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="group/snippet rounded-lg ring-1 ring-border">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <span className="text-[13px] font-medium">{snippet.title}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground opacity-0 group-hover/snippet:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
          aria-label={`Copy ${snippet.title} code`}
          onClick={copy}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
      <pre className="mx-2 mt-1.5 overflow-x-auto rounded-md bg-muted/60 px-3 py-2 font-mono text-[12.5px] leading-relaxed">
        <code>{highlight(snippet.code)}</code>
      </pre>
      {(snippet.js || snippet.note) && (
        <div className="flex flex-col gap-1 px-3 pt-2 pb-2.5 text-xs text-muted-foreground">
          {snippet.js && (
            <p className="flex items-baseline gap-2">
              <span className="shrink-0 rounded bg-amber-400/15 px-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                JS
              </span>
              <code className="font-mono text-[11.5px]">{snippet.js}</code>
            </p>
          )}
          {snippet.note && <p>{snippet.note}</p>}
        </div>
      )}
      {!snippet.js && !snippet.note && <div className="h-2" />}
    </div>
  )
}

const KEYWORDS = new Set(
  'def class return if elif else for while in not and or is import from as lambda nonlocal global pass break continue with yield try except raise del'.split(
    ' ',
  ),
)
const BUILTINS = new Set(
  'len range enumerate zip sorted reversed min max sum abs print list dict set tuple int str float bool any all map filter ord chr divmod bin self heapq math sys copy'.split(
    ' ',
  ),
)
const CONSTANTS = new Set(['None', 'True', 'False'])
const TOKEN = /(#.*$)|(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*')|(@\w+)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b/gm

/** Tiny Python highlighter — enough for cheatsheet snippets, rendered as React nodes. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of code.matchAll(TOKEN)) {
    const [text, comment, string, decorator, number, word] = m
    const start = m.index
    if (start > last) out.push(code.slice(last, start))
    let cls: string | null = null
    if (comment) cls = 'text-syntax-comment italic'
    else if (string) cls = 'text-syntax-string'
    else if (decorator) cls = 'text-syntax-entity'
    else if (number || (word && CONSTANTS.has(word))) cls = 'text-syntax-constant'
    else if (word && KEYWORDS.has(word)) cls = 'text-syntax-keyword'
    else if (word && BUILTINS.has(word)) cls = 'text-syntax-entity'
    out.push(
      cls ? (
        <span key={key++} className={cls}>
          {text}
        </span>
      ) : (
        text
      ),
    )
    last = start + text.length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}
