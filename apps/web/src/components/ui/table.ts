/** Shared table styling. Wrap the table in <Panel padded={false}> or TABLE.wrap. */
export const TABLE = {
  wrap: 'overflow-x-auto rounded-card border bg-surface',
  table: 'min-w-full text-left text-sm',
  head: 'border-b text-xs text-subtle',
  th: 'px-4 py-2.5 font-medium whitespace-nowrap',
  body: 'divide-y divide-line',
  row: 'hover:bg-hover',
  td: 'px-4 py-3 align-middle text-fg',
  /** Numbers, sizes and dates. */
  tdMeta: 'px-4 py-3 align-middle font-mono text-xs tabular-nums whitespace-nowrap text-muted',
} as const
