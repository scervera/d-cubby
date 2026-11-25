import Spinner from './Spinner'

export default function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <Spinner size="lg" />
    </div>
  )
}
