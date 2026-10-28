import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { useAccount, usePrefs, useTracker, useUI } from '@/lib/store'
import type { TrackerData } from '@/types'

/** A fresh start for a component test: default data plus `data`, every dialog closed, default preferences, signed out. */
export function resetStores(data: Partial<TrackerData> = {}) {
  // Merge rather than replace, so the tracker keeps its actions.
  useTracker.setState({ ...TRACKER_DEFAULTS, ...data })
  useUI.setState(useUI.getInitialState(), true)
  usePrefs.setState(usePrefs.getInitialState(), true)
  useAccount.setState(useAccount.getInitialState(), true)
}
