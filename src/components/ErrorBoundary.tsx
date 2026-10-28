import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { DownloadIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { downloadFile } from '@/lib/_utils/browser'
import { localDate } from '@/lib/_utils/date'

/**
 * Last line of defense: if rendering throws, show a way out instead of a blank page — without
 * touching the store, since the saved data may be what's broken.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LeetCode Tracker crashed', error, info.componentStack)
  }

  render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children
  }
}

function CrashScreen({ error }: { error: Error }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const saved = readSaved()

  const download = () => {
    if (saved !== null) downloadFile(`leetcode-tracker-rescue-${localDate()}.json`, saved, 'application/json')
  }
  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.tracker)
      // Sync starts over too, so a signed-in device fetches its progress again instead of keeping the empty start.
      localStorage.removeItem(STORAGE_KEYS.sync)
    } finally {
      location.reload()
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-5 px-5 py-10">
      <div className="flex items-center gap-2.5">
        <TriangleAlertIcon className="size-5 text-attempted-foreground" />
        <h1 className="text-lg font-semibold">Something went wrong</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        The tracker hit an error while showing your data. Your progress is still saved in this browser — download a copy
        first, then try reloading.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download} disabled={saved === null}>
          <DownloadIcon /> Download my data
        </Button>
        <Button variant="outline" onClick={() => location.reload()}>
          <RotateCwIcon /> Reload
        </Button>
      </div>

      <div className="border-t pt-4 text-[13px]">
        {confirmReset ? (
          <div className="flex flex-col gap-2">
            <p>This deletes all progress saved in this browser. You can import the downloaded copy afterwards.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={reset}>
                Yes, reset everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Still broken after reloading?{' '}
            <Button variant="link" size="xs" className="h-auto p-0 text-[13px]" onClick={() => setConfirmReset(true)}>
              Reset the app
            </Button>
          </p>
        )}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Error details</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 whitespace-pre-wrap">{error.stack ?? error.message}</pre>
      </details>
    </main>
  )
}

/** The raw saved JSON, exactly as stored — even if it no longer parses as valid data. */
function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.tracker)
  } catch {
    return null
  }
}
