export default function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
    </div>
  )
}
