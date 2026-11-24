/** Only same-site paths, so ?next= can't send people to another site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/assets'
}
