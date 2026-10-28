// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { STORAGE_VERSION, useTracker } from '@/lib/store'
import { attempt, idOf, progressOf } from '@/test/builders'
import type { TrackerData } from '@/types'
import { startEngine, type Choice, type RemoteItem, type RemoteStore, type SyncEngine, type SyncHooks } from './engine'
import { itemsOf } from './items'

const uid = 'u1'
const twoSum = idOf('Two Sum')
const validAnagram = idOf('Valid Anagram')

/** The cloud as a map, with a server clock that moves on every write. */
function fakeCloud(items: Record<string, unknown> = {}) {
  let clock = 1_000
  const docs = new Map<string, RemoteItem>()
  const put = (id: string, data: unknown, schema = STORAGE_VERSION) => docs.set(id, { id, data, schema, updatedAt: (clock += 10) })
  for (const [id, data] of Object.entries(items)) put(id, data)
  const remote: RemoteStore = {
    changedSince: vi.fn(async (_uid: string, since: number | null) => [...docs.values()].filter((d) => since === null || d.updatedAt > since)),
    write: vi.fn(async (_uid: string, written: { id: string; data: unknown }[]) => {
      clock += 10
      for (const { id, data } of written) docs.set(id, { id, data, schema: STORAGE_VERSION, updatedAt: clock })
    }),
  }
  /** What the cloud holds now, without deleted items. */
  const live = () => new Map([...docs].filter(([, d]) => d.data !== null).map(([id, d]) => [id, d.data]))
  return { remote, put, live, now: () => clock, written: () => vi.mocked(remote.write).mock.calls.flatMap(([, w]) => w.map((x) => x.id)) }
}

const hooks = (choice: Choice | null = 'cloud'): SyncHooks => ({ ask: vi.fn(async () => choice), newVersion: vi.fn() })
const local = (data: Partial<TrackerData>) => useTracker.setState({ ...TRACKER_DEFAULTS, ...data })
const meta = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.sync) ?? 'null')
const settle = () => vi.advanceTimersByTimeAsync(0)

let engines: SyncEngine[] = []
const start = (remote: RemoteStore, h: SyncHooks = hooks()) => {
  const engine = startEngine(uid, remote, h)
  engines.push(engine)
  return engine
}

const solvedTwoSum = attempt('Two Sum', '2026-10-27')
const solvedAnagram = attempt('Valid Anagram', '2026-10-26')

describe('sync engine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    local({})
  })
  afterEach(() => {
    engines.forEach((e) => e.stop())
    engines = []
    vi.useRealTimers()
  })

  describe('first sign-in on this device', () => {
    it('uploads this device’s progress to an empty cloud', async () => {
      local({ attempts: [solvedTwoSum], progress: progressOf('solved', 'Two Sum') })
      const cloud = fakeCloud()
      start(cloud.remote)
      await settle()

      expect(cloud.live()).toEqual(
        new Map<string, unknown>([
          [`attempt:${solvedTwoSum.key}`, solvedTwoSum],
          [`problem:${twoSum}`, { progress: progressOf('solved', 'Two Sum')[twoSum] }],
        ]),
      )
      expect(meta()).toMatchObject({ uid, linked: true, dirty: [] })
    })

    it('fills an empty device from the cloud, without asking', async () => {
      const cloud = fakeCloud({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum, settings: { ...itemsOf(TRACKER_DEFAULTS).get('settings') as object, weekdayGoal: 2 } })
      const h = hooks()
      start(cloud.remote, h)
      await settle()

      expect(h.ask).not.toHaveBeenCalled()
      expect(useTracker.getState()).toMatchObject({ attempts: [solvedTwoSum], weekdayGoal: 2 })
      expect(cloud.written()).toEqual([])
    })

    it('keeps both sides when nothing differs, without asking', async () => {
      local({ attempts: [solvedAnagram] })
      const cloud = fakeCloud({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum })
      const h = hooks()
      start(cloud.remote, h)
      await settle()

      expect(h.ask).not.toHaveBeenCalled()
      expect(useTracker.getState().attempts).toEqual([solvedAnagram, solvedTwoSum])
      expect(cloud.live().size).toBe(2)
    })

    it('asks when an item differs, and “cloud” makes this device a copy of the cloud', async () => {
      local({ attempts: [solvedAnagram], weekdayGoal: 3, timer: { id: twoSum, startedAt: null, elapsed: 1000 } })
      const cloud = fakeCloud({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum, settings: { weekdayGoal: 2, weekendGoal: 3, weeklyDays: 4, coreFirst: true, interview: null } })
      const h = hooks('cloud')
      start(cloud.remote, h)
      await settle()

      expect(h.ask).toHaveBeenCalledOnce()
      expect(useTracker.getState()).toMatchObject({ attempts: [solvedTwoSum], weekdayGoal: 2 })
      expect(useTracker.getState().timer).toEqual({ id: twoSum, startedAt: null, elapsed: 1000 })
      expect(cloud.written()).toEqual([])
    })

    it('“this device” makes the cloud a copy of this device', async () => {
      local({ attempts: [solvedAnagram], weekdayGoal: 3 })
      const cloud = fakeCloud({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum, settings: { weekdayGoal: 2, weekendGoal: 3, weeklyDays: 4, coreFirst: true, interview: null } })
      start(cloud.remote, hooks('device'))
      await settle()

      expect(useTracker.getState().attempts).toEqual([solvedAnagram])
      expect(cloud.live()).toEqual(itemsOf(useTracker.getState()))
    })

    it('does nothing when the question is put off, and asks again next time', async () => {
      local({ weekdayGoal: 3 })
      const cloud = fakeCloud({ settings: { weekdayGoal: 2, weekendGoal: 3, weeklyDays: 4, coreFirst: true, interview: null } })
      start(cloud.remote, hooks(null))
      await settle()

      expect(useTracker.getState().weekdayGoal).toBe(3)
      expect(cloud.written()).toEqual([])
      expect(meta()).toMatchObject({ linked: false })
    })
  })

  describe('once linked', () => {
    async function linked(items: Record<string, unknown> = {}) {
      const cloud = fakeCloud(items)
      start(cloud.remote)
      await settle()
      vi.mocked(cloud.remote.write).mockClear()
      return cloud
    }

    it('uploads only the items a change touched, 2 s later', async () => {
      const cloud = await linked()
      useTracker.getState().setStatus(twoSum, 'solved', '2026-10-28')
      await settle()
      expect(cloud.remote.write).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(2000)
      expect(cloud.written()).toEqual([`problem:${twoSum}`])
      expect(meta().dirty).toEqual([])
    })

    it('never uploads the running timer', async () => {
      local({ plans: { '2026-10-28': [{ id: twoSum, done: false }] } })
      const cloud = await linked()
      useTracker.getState().startTimer(twoSum, '2026-10-28')
      useTracker.getState().pauseTimer()
      await vi.advanceTimersByTimeAsync(5000)
      expect(cloud.remote.write).not.toHaveBeenCalled()
    })

    it('fetches what another device changed, deletions too, when the device is back online', async () => {
      const cloud = await linked({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum })
      expect(useTracker.getState().attempts).toEqual([solvedTwoSum])

      cloud.put(`attempt:${solvedTwoSum.key}`, null)
      cloud.put(`problem:${validAnagram}`, { note: 'count letters' })
      window.dispatchEvent(new Event('online'))
      await settle()

      expect(useTracker.getState().attempts).toEqual([])
      expect(useTracker.getState().notes).toEqual({ [validAnagram]: 'count letters' })
      expect(cloud.remote.write).not.toHaveBeenCalled()
      // The next pull starts from the newest item it saw.
      expect(meta().pulledTo).toBe(cloud.now())
    })

    it('keeps a change made here over a fetched one until it is uploaded', async () => {
      const cloud = await linked()
      useTracker.getState().setNote(twoSum, 'mine')
      cloud.put(`problem:${twoSum}`, { note: 'theirs' })
      window.dispatchEvent(new Event('online'))
      await settle()

      expect(useTracker.getState().notes[twoSum]).toBe('mine')
      expect(cloud.live().get(`problem:${twoSum}`)).toEqual({ note: 'mine' })
    })

    it('keeps unsent changes through a failed upload and a reload', async () => {
      const cloud = await linked({ [`attempt:${solvedTwoSum.key}`]: solvedTwoSum })
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(cloud.remote.write).mockRejectedValueOnce(new Error('offline'))
      useTracker.getState().setNote(twoSum, 'offline note')
      await vi.advanceTimersByTimeAsync(2000)
      expect(meta().dirty).toEqual([`problem:${twoSum}`])

      engines.forEach((e) => e.stop())
      start(cloud.remote)
      await settle()
      expect(cloud.live().get(`problem:${twoSum}`)).toEqual({ note: 'offline note' })
      expect(meta().dirty).toEqual([])
      // Still linked after the reload: it asked only for what changed, not for everything.
      expect(vi.mocked(cloud.remote.changedSince).mock.lastCall?.[1]).toEqual(expect.any(Number))
    })

    it('uploads again what changed while an upload was on its way', async () => {
      const cloud = await linked()
      let land = () => {}
      vi.mocked(cloud.remote.write).mockImplementationOnce(() => new Promise<void>((resolve) => (land = resolve)))
      useTracker.getState().setNote(twoSum, 'first')
      await vi.advanceTimersByTimeAsync(2000)
      useTracker.getState().setNote(twoSum, 'second')
      land()
      await settle()
      expect(meta().dirty).toEqual([`problem:${twoSum}`])

      await vi.advanceTimersByTimeAsync(2000)
      expect(cloud.live().get(`problem:${twoSum}`)).toEqual({ note: 'second' })
      expect(meta().dirty).toEqual([])
    })

    it('stops, and says so once, when another device runs a newer version', async () => {
      const cloud = fakeCloud()
      const h = hooks()
      start(cloud.remote, h)
      await settle()
      cloud.put('settings', {}, STORAGE_VERSION + 1)

      window.dispatchEvent(new Event('online'))
      await settle()
      expect(h.newVersion).toHaveBeenCalledOnce()

      useTracker.getState().setNote(twoSum, 'not sent')
      await vi.advanceTimersByTimeAsync(5000)
      expect(cloud.written()).not.toContain(`problem:${twoSum}`)
    })
  })
})
