/**
 * Every localStorage key the app owns, in one place so they can't collide. `theme` is also read by
 * the inline script in index.html, which applies the theme before first paint — keep the two in sync.
 */
export const STORAGE_KEYS = {
  tracker: 'leetcode-tracker',
  theme: 'leetcode-tracker-theme',
} as const
