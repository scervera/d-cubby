'use client'

import type { ReactNode } from 'react'

export interface Segment<T extends string> {
  value: T
  /** Visible text. Leave out for an icon-only segment and set `title`. */
  label?: ReactNode
  icon?: ReactNode
  /** Accessible name and tooltip; required when there is no label. */
  title?: string
}

/** Pick one of a few options that take effect immediately (view mode, thumbnail size). */
export default function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  segments,
}: {
  /** Accessible name of the group. */
  label: string
  value: T
  onChange: (value: T) => void
  segments: Segment<T>[]
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-9 items-center gap-0.5 rounded-control bg-sunken p-0.5">
      {segments.map((segment) => {
        const active = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            aria-label={segment.label ? undefined : segment.title}
            title={segment.title}
            onClick={() => onChange(segment.value)}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-thumb text-xs font-medium transition-colors duration-100 [&>svg]:h-4 [&>svg]:w-4 ${
              segment.label ? 'px-2.5' : 'w-8'
            } ${active ? 'bg-surface text-fg' : 'text-muted hover:text-fg'}`}
          >
            {segment.icon}
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
