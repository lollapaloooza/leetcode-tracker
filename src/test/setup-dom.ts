// Runs before every component test (*.test.tsx): Testing Library's matchers, a fresh DOM, storage
// and stores for each test, and the few browser APIs jsdom leaves out.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetStores } from './stores'

// jsdom has no layout or media queries. Radix measures elements and the theme reads the OS
// setting, so these only need to exist; a test that cares stubs its own `matchMedia`.
window.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
}))
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.releasePointerCapture = vi.fn()

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  resetStores()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
