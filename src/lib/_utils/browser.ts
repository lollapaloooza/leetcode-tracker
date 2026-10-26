/** Open a URL in a new tab from a click handler — a real link click, so browsers never treat it as a popup. */
export function openInNewTab(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()
}

/** Whether to animate: false when the OS asks for reduced motion (and where there are no media queries). */
export const prefersMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: no-preference)').matches

/** Save text as a file through a temporary download link. */
export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
