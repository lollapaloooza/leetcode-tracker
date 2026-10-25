import type { SVGProps } from 'react'

/** Simplified two-snake Python mark: blue snake top-left, yellow snake rotated 180°. */
export function PythonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden {...props}>
      <path
        fill="#3776AB"
        fillRule="evenodd"
        d="M9 2h5a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 14 10h-4a2 2 0 0 0-2 2v3.5H5.5A3.5 3.5 0 0 1 2 12v-1a3.5 3.5 0 0 1 3.5-3.5h6v-.75h-4V3.5A1.5 1.5 0 0 1 9 2Zm1 1.35a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"
      />
      <path
        fill="#FFD43B"
        fillRule="evenodd"
        d="M15 22h-5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 10 14h4a2 2 0 0 0 2-2V8.5h2.5A3.5 3.5 0 0 1 22 12v1a3.5 3.5 0 0 1-3.5 3.5h-6v.75h4v3.25A1.5 1.5 0 0 1 15 22Zm-1-1.35a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  )
}
