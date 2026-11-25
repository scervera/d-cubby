'use client'

import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

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

  if (totalPages <= 1) {
    return (
        <div className="rounded-card border bg-surface mt-4 sm:mt-6 flex items-center justify-between border border-line px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-muted">
              {t('pagination.showingTotal', { total: totalItems })}
            </span>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                disabled={loading}
                  className="ml-1 sm:ml-2 rounded-control border border-line bg-surface px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-muted"
              >
                {allowedPageSizes.map((size) => (
                  <option key={size} value={size}>{t('pagination.perPage', { count: size })}</option>
                ))}
              </select>
          </div>
        </div>
      </div>
    )
  }

  return (
      <div className="rounded-card border bg-surface mt-4 sm:mt-6 flex items-center justify-between border border-line px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <span className="text-xs sm:text-sm text-subtle">
            <span className="hidden sm:inline">{t('pagination.showingRange', { start: startItem, end: endItem, total: totalItems })}</span>
            <span className="sm:hidden">{t('pagination.showingTotal', { total: totalItems })}</span>
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            disabled={loading}
              className="ml-1 sm:ml-2 rounded-control border border-line bg-surface px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-muted"
          >
            {allowedPageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
              className="relative inline-flex items-center rounded-l-control border border-line bg-surface px-1.5 sm:px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-subtle transition-colors hover:border-line-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                  <span className="relative inline-flex items-center rounded-control border border-line bg-surface px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-subtle">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  disabled={loading}
                    className={`relative inline-flex items-center rounded-control border px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
                    currentPage === page
                        ? 'z-10 border-accent bg-accent-subtle text-accent-text'
                        : 'border-line bg-surface text-subtle hover:border-line-strong hover:bg-hover'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
              className="relative inline-flex items-center rounded-r-control border border-line bg-surface px-1.5 sm:px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-subtle transition-colors hover:border-line-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Pagination
