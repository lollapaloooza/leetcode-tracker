import type { ElementType } from 'react'
import { CloudIcon, LoaderCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AccountStatus } from '@/lib/store'

interface SignInCardProps {
  status: AccountStatus
  error: string | null
  onSignIn: () => void
  /** Phones: the bottom sheet gets a Cancel button. */
  onCancel?: () => void
  /** The heading element: `SheetTitle` in a sheet, so the sheet is named by it. */
  Title: ElementType
  titleId?: string
}

/** One line on what signing in gives you, and Google's button. */
export function SignInCard({ status, error, onSignIn, onCancel, Title, titleId }: SignInCardProps) {
  const busy = status === 'signing-in'
  return (
    <div className="flex flex-col gap-4">
      <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
        <CloudIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <Title {...(titleId && { id: titleId })} className="text-base leading-tight font-semibold">
          Save your progress
        </Title>
        <p className="text-[13px] text-muted-foreground">Sign in to keep your progress on all your devices.</p>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      {/* Google's own button style: white, with the G and a grey outline, in both themes. */}
      <button
        type="button"
        disabled={busy}
        onClick={onSignIn}
        className="inline-flex h-10 items-center justify-center gap-2.5 rounded-lg border border-[#747775] bg-white text-sm font-medium text-[#1f1f1f] transition-[background-color,transform] duration-150 outline-none hover:bg-[#f2f2f2] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none max-sm:h-12 max-sm:text-[15px]"
      >
        {busy ? <LoaderCircleIcon aria-hidden className="size-4.5 animate-spin text-[#5f6368]" /> : <GoogleIcon />}
        Sign in with Google
      </button>
      {onCancel && (
        <Button variant="secondary" className="h-11" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4.5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
