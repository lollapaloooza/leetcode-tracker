import type { Problem } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { SITE_NAME, siteUrl, type Site } from '@/lib/domain'
import { usePrefs, useTracker, useUI } from '@/lib/store'

/** Put the clock on a problem. Starting something also refills the Now card if you'd emptied it. */
export function beginTimer(id: number, today: string) {
  useTracker.getState().startTimer(id, today)
  useUI.getState().restoreFocus()
}

/**
 * Start a problem and open it on `site` (null: only the timer). Call it from a click, so browsers
 * treat the new tab as wanted rather than as a popup.
 */
export function startProblem(problem: Problem, today: string, site: Site | null) {
  beginTimer(problem.id, today)
  useUI.getState().setOpenedOn(site ? { id: problem.id, site } : null)
  if (site) openInNewTab(siteUrl(problem, site))
}

/** What every Start button does: ask where to solve it, unless this device remembered the answer. */
export function requestStart(problem: Problem, today: string) {
  const opens = usePrefs.getState().startOpens
  if (opens === 'ask') {
    useUI.getState().openStart(problem.id)
    return
  }
  const site = opens === 'nothing' ? null : opens
  startProblem(problem, today, site)
  useUI.getState().showToast({
    text: site ? `Started · opened ${SITE_NAME[site]}` : 'Timer started',
    action: { label: 'Ask next time', run: () => usePrefs.getState().setStartOpens('ask') },
  })
}
