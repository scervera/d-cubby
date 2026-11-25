const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

/** Decorative; give the surrounding region role="status" and a label when it matters. */
export default function Spinner({ size = 'md', className = '' }: { size?: keyof typeof SIZES; className?: string }) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-line border-t-accent ${SIZES[size]} ${className}`} />
}

/** A centred spinner for a section that is loading. */
export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted" role="status" aria-live="polite">
      <Spinner />
      {label}
    </div>
  )
}
