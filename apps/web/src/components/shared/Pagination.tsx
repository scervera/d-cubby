'use client'

import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

import { inputClassSm } from '@/components/forms/fields'
import { IconButton } from '@/components/ui/Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  loading?: boolean
  allowedPageSizes?: number[]
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
  allowedPageSizes = [20, 40, 60]
}) => {
  const t = useTranslations('common')
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const perPageSelect = (
    <select
      value={itemsPerPage}
      onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
      disabled={loading}
      aria-label={t('pagination.perPage', { count: itemsPerPage })}
      className={`${inputClassSm} w-auto`}
    >
      {allowedPageSizes.map((size) => (
        <option key={size} value={size}>
          {t('pagination.perPage', { count: size })}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4">
      <div className="flex items-center gap-3">
        <span className="text-meta whitespace-nowrap">
          {totalPages <= 1 ? (
            t('pagination.showingTotal', { total: totalItems })
          ) : (
            <>
              <span className="hidden sm:inline">{t('pagination.showingRange', { start: startItem, end: endItem, total: totalItems })}</span>
              <span className="sm:hidden">{t('pagination.showingTotal', { total: totalItems })}</span>
            </>
          )}
        </span>
        {perPageSelect}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <IconButton size="sm" aria-label={t('pagination.previous')} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1 || loading}>
            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
          </IconButton>

          {getVisiblePages().map((page, index) =>
            page === '...' ? (
              <span key={index} className="px-1 text-xs text-subtle">
                …
              </span>
            ) : (
              <button
                key={index}
                type="button"
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-control px-2 font-mono text-xs tabular-nums transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                  currentPage === page ? 'bg-accent-subtle font-medium text-accent-text' : 'text-muted hover:bg-hover hover:text-fg'
                }`}
              >
                {page}
              </button>
            ),
          )}

          <IconButton size="sm" aria-label={t('pagination.next')} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || loading}>
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      )}
    </div>
  )
}

export default Pagination
