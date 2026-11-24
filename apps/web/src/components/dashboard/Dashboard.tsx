'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import AssetFilters, { type AssetFiltersState, type FilterContext } from '@/components/shared/AssetFilters'
import Pagination from '@/components/shared/Pagination'
import SharedLayout from '@/components/shared/SharedLayout'
import ThumbnailSizeSelector from '@/components/ui/ThumbnailSizeSelector'
import { ThumbnailSizeProvider } from '@/contexts/ThumbnailSizeContext'
import { useAuth } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'
import { canWrite } from '@/lib/auth/permissions'
import { API_ENDPOINTS, buildContextualAssetUrl } from '@/lib/config'
import { getCookie, setCookie } from '@/lib/cookies'
import { isAssetCategory, type Asset, type AssetCategory } from '@/lib/dam/types'
import { smartFoldersApi, type SmartFolder } from '@/lib/smartFoldersApi'

import AssetGrid, { TOGGLE_BULK_DELETE_EVENT } from './AssetGrid'
import FileUpload from './FileUpload'
import { formatFileSize, getAssetTags, tagName, withUploaderId } from './assetUtils'

const PAGE_SIZES = [20, 40, 60]
const SMART_FOLDER_PREFIX = 'smart_folder_'

/** Where the library opens, from the URL: /assets?category=image, ?smart_folder=3, ?tag_ids=1,2&q=beach. */
export interface DashboardInitialState {
  category?: string | null
  smartFolderId?: number | null
  tagIds?: number[] | null
  search?: string | null
}

interface AssetListResponse {
  data?: Asset[]
  included?: unknown[]
  meta?: { total_count?: number; total_pages?: number; current_page?: number }
}

interface Stats {
  total_assets: number
  storage_bytes: number
}

function initialPageSize(): number {
  const saved = Number.parseInt(getCookie('itemsPerPage') ?? '', 10)
  return PAGE_SIZES.includes(saved) ? saved : 20
}

/** The asset library: filters, grid/list, pagination, upload and smart folder views. */
export default function Dashboard({ initial = {} }: { initial?: DashboardInitialState }) {
  const { user } = useAuth()
  const tDashboard = useTranslations('dashboard')
  const tAssets = useTranslations('assets')

  // What is listed: all assets (optionally one file category) or one smart folder.
  const [smartFolderId, setSmartFolderId] = useState<number | null>(initial.smartFolderId ?? null)
  const [fileCategory, setFileCategory] = useState<AssetCategory>(
    !initial.smartFolderId && isAssetCategory(initial.category) ? initial.category : 'all',
  )
  const [search, setSearch] = useState((initial.search ?? '').trim())
  const [tagIds, setTagIds] = useState<number[] | null>(initial.tagIds?.length ? initial.tagIds : null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  // Rendered only on the client (behind useRequireAuth), so the cookie is readable here.
  const [perPage, setPerPage] = useState(initialPageSize)
  const [filtersKey, setFiltersKey] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const [assets, setAssets] = useState<Asset[]>([])
  const [smartFolder, setSmartFolder] = useState<SmartFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const requestIdRef = useRef(0)

  const selectedCategory = smartFolderId ? `${SMART_FOLDER_PREFIX}${smartFolderId}` : fileCategory
  const filterContext: FilterContext = smartFolderId ? { type: 'smart_folder', id: String(smartFolderId) } : { type: 'all' }

  // Keep the address bar in step with what is shown (without a navigation).
  useEffect(() => {
    const params = new URLSearchParams()
    if (smartFolderId) params.set('smart_folder', String(smartFolderId))
    else if (fileCategory !== 'all') params.set('category', fileCategory)
    if (tagIds?.length) {
      params.set('tag_ids', tagIds.join(','))
      if (search) params.set('q', search)
    }
    const query = params.toString()
    window.history.replaceState(window.history.state, '', query ? `/assets?${query}` : '/assets')
  }, [smartFolderId, fileCategory, tagIds, search])

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get<Stats>(API_ENDPOINTS.DASHBOARD_STATS)
      setStats(data)
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats, reloadToken])

  // Load the current page of assets. Responses for superseded requests are ignored.
  useEffect(() => {
    const requestId = ++requestIdRef.current
    const isCurrent = () => requestId === requestIdRef.current
    setLoading(true)
    setError(null)

    const run = async () => {
      if (smartFolderId) {
        const url = buildContextualAssetUrl(
          { type: 'smart_folder', id: String(smartFolderId) },
          { search: '', category: fileCategory },
        )
        const [folder, response] = await Promise.all([smartFoldersApi.getById(smartFolderId), api.get<AssetListResponse>(url)])
        if (!isCurrent()) return
        const included = response.data.included ?? []
        // The smart folder endpoint has no text search; filter by name and tag here.
        const needle = search.toLowerCase()
        const list = (response.data.data ?? [])
          .map((asset) => withUploaderId(asset, included))
          .filter(
            (asset) =>
              !needle ||
              asset.attributes.name.toLowerCase().includes(needle) ||
              getAssetTags(asset).some((tag) => tagName(tag).toLowerCase().includes(needle)),
          )
        setSmartFolder(folder)
        setAssets(list)
        setTotalItems(list.length)
        setTotalPages(1)
        return
      }

      const url = buildContextualAssetUrl(
        { type: 'all' },
        { search, category: fileCategory, tagIds: tagIds ?? undefined },
        { page, per_page: perPage },
      )
      const response = await api.get<AssetListResponse>(url)
      if (!isCurrent()) return
      const included = response.data.included ?? []
      const list = (response.data.data ?? []).map((asset) => withUploaderId(asset, included))
      setSmartFolder(null)
      setAssets(list)
      setTotalItems(response.data.meta?.total_count ?? list.length)
      setTotalPages(response.data.meta?.total_pages ?? 1)
    }

    run()
      .catch((err) => {
        if (!isCurrent()) return
        setAssets([])
        setTotalItems(0)
        setTotalPages(0)
        setError(apiErrorMessage(err, tAssets('errorLoadingAssets')))
      })
      .finally(() => isCurrent() && setLoading(false))
  }, [smartFolderId, fileCategory, search, tagIds, page, perPage, reloadToken, tAssets])

  /** Reload after uploads, deletes and edits. Thumbnails are generated in the background. */
  const handleAssetsChange = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  // Sidebar: "all", a file category, or "smart_folder_<id>".
  const handleCategoryChange = useCallback((category: string) => {
    if (category.startsWith(SMART_FOLDER_PREFIX)) {
      const id = Number.parseInt(category.slice(SMART_FOLDER_PREFIX.length), 10)
      if (!Number.isNaN(id)) {
        setSmartFolderId(id)
        setFileCategory('all')
      }
    } else {
      setSmartFolderId(null)
      setFileCategory(isAssetCategory(category) ? category : 'all')
    }
    setSearch('')
    setTagIds(null)
    setPage(1)
    setFiltersKey((k) => k + 1)
  }, [])

  // Filter bar: search text, file category and view mode.
  const handleFiltersChange = useCallback((filters: AssetFiltersState) => {
    setSearch(filters.search.trim())
    setFileCategory(isAssetCategory(filters.category) ? filters.category : 'all')
    setViewMode(filters.viewMode)
    // Editing the search replaces a tag filter that came from the Tags page.
    setTagIds(null)
    setPage(1)
  }, [])

  const handleItemsPerPageChange = useCallback((next: number) => {
    const size = PAGE_SIZES.includes(next) ? next : 20
    setCookie('itemsPerPage', String(size))
    setPerPage(size)
    setPage(1)
  }, [])

  const title = smartFolder ? smartFolder.name : tAssets('allAssetsTitle')
  const subtitle = useMemo(() => {
    if (!smartFolder) return null
    const tags = smartFolder.tag_names?.length ? tAssets('tagsPrefix', { tags: smartFolder.tag_names.join(', ') }) : null
    return { count: tAssets('smartFolderWithAssets', { count: smartFolder.asset_count }), tags }
  }, [smartFolder, tAssets])

  const mayWrite = canWrite(user)

  return (
    <ThumbnailSizeProvider>
      <SharedLayout currentPage="assets" selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange}>
        <div className="glass-panel-soft border border-white/30 px-3 py-3 sm:px-5 sm:py-4 dark:border-white/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-slate-900 drop-shadow-sm sm:text-2xl dark:text-[#E3E1CE]">{title}</h1>
              {subtitle && (
                <p className="mt-2 max-w-xl text-xs text-slate-400 sm:text-sm dark:text-slate-400">
                  {subtitle.count}
                  {subtitle.tags && <span className="ml-2 hidden sm:inline">• {subtitle.tags}</span>}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:ml-4">
              <StatChip label={tDashboard('stats.assets')} value={stats?.total_assets ?? totalItems} />
              <StatChip label={tDashboard('stats.storageUsed')} value={stats ? formatFileSize(stats.storage_bytes) : '—'} />
            </div>
          </div>
        </div>

        <AssetFilters
          key={filtersKey}
          context={filterContext}
          onFiltersChange={handleFiltersChange}
          initialSearch={search || undefined}
          initialCategory={fileCategory}
          className="glass-panel-soft mt-6 border border-white/25"
        />

        {(viewMode === 'grid' || mayWrite) && (
          <div className="glass-panel-soft mt-6 border border-white/25 px-4 py-4 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {viewMode === 'grid' && (
                <div className="flex items-center gap-3">
                  <ThumbnailSizeSelector />
                </div>
              )}
              {mayWrite && (
                <div className={`flex w-full gap-2 ${viewMode === 'grid' ? 'flex-col sm:w-auto sm:flex-row' : 'flex-row'}`}>
                  <button
                    onClick={() => setShowUpload(true)}
                    className={`rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 ${
                      viewMode === 'list' ? 'flex-[3]' : 'w-full sm:w-auto'
                    }`}
                  >
                    {tAssets('uploadFiles')}
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new Event(TOGGLE_BULK_DELETE_EVENT))}
                    className={`rounded-xl border border-red-200/60 bg-red-500/80 px-4 py-2 text-sm font-semibold text-white shadow-md backdrop-blur hover:border-red-200 hover:bg-red-500 ${
                      viewMode === 'list' ? 'flex-1' : 'w-full sm:w-auto'
                    }`}
                  >
                    {tAssets('bulkDelete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && assets.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
            <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-[#D4A574] dark:border-[#F6DAA9]" />
          </div>
        ) : error && assets.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="glass-panel-soft max-w-md rounded-3xl border border-white/30 p-8 text-center dark:border-white/10">
              <div className="mb-4 text-lg font-semibold text-rose-500 dark:text-rose-400">{tAssets('errorLoadingAssets')}</div>
              <div className="mb-6 text-sm text-slate-600 dark:text-slate-300">{error}</div>
              <button
                onClick={handleAssetsChange}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              >
                {tAssets('tryAgain')}
              </button>
            </div>
          </div>
        ) : (
          <AssetGrid assets={assets} category={selectedCategory} viewMode={viewMode} user={user} onAssetsChange={handleAssetsChange} />
        )}

        {!smartFolderId && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={perPage}
            onPageChange={setPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
            allowedPageSizes={PAGE_SIZES}
          />
        )}

        {showUpload && (
          // FileUpload calls onUploadSuccess again after a few seconds to pick up thumbnails.
          <FileUpload onUploadSuccess={handleAssetsChange} onClose={() => setShowUpload(false)} />
        )}
      </SharedLayout>
    </ThumbnailSizeProvider>
  )
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
      <div className="text-[var(--foreground)]/65">{label}</div>
      <div className="text-sm text-[var(--foreground)]">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}
