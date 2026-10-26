import { lazy, type ComponentType } from 'react'

const preloaders: (() => Promise<unknown>)[] = []

/**
 * A component split into its own chunk, so it stays out of the first download. Every one is
 * fetched in the background once the page is idle (`preloadLazyComponents`), so opening it later
 * rarely waits on the network.
 */
export function lazyComponent<P extends object>(load: () => Promise<ComponentType<P>>) {
  let pending: Promise<{ default: ComponentType<P> }> | undefined
  const preload = () =>
    (pending ??= load().then(
      (component) => ({ default: component }),
      (error: unknown) => {
        pending = undefined // offline or a deploy changed the chunk: try again next time
        throw error
      },
    ))
  preloaders.push(preload)
  return lazy(preload)
}

export function preloadLazyComponents() {
  const run = () => preloaders.forEach((preload) => preload().catch(() => {}))
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
