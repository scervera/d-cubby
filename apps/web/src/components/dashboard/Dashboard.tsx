'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'

import AssetFilters, { type AssetFiltersState, type FilterContext } from '@/components/shared/AssetFilters'
import Pagination from '@/components/shared/Pagination'
import SharedLayout from '@/components/shared/SharedLayout'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import { LoadingBlock } from '@/components/ui/Spinner'
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
        <PageHeader
          title={title}
          description={subtitle ? [subtitle.count, subtitle.tags].filter(Boolean).join(' · ') : undefined}
          actions={
            mayWrite && (
              <>
                <Button variant="danger-ghost" onClick={() => window.dispatchEvent(new Event(TOGGLE_BULK_DELETE_EVENT))}>
                  {tAssets('bulkDelete')}
                </Button>
                <Button onClick={() => setShowUpload(true)}>
                  <ArrowUpTrayIcon className="h-4 w-4" aria-hidden />
                  {tAssets('uploadFiles')}
                </Button>
              </>
            )
          }
        >
          {!subtitle && (
            <p className="text-meta mt-1">
              {tAssets('grid.assetCount', { count: stats?.total_assets ?? totalItems })}
              {stats && ` · ${formatFileSize(stats.storage_bytes)}`}
            </p>
          )}
        </PageHeader>

        <AssetFilters
          key={filtersKey}
          context={filterContext}
          onFiltersChange={handleFiltersChange}
          initialSearch={search || undefined}
          initialCategory={fileCategory}
          trailing={viewMode === 'grid' ? <ThumbnailSizeSelector /> : undefined}
        />

        {loading && assets.length === 0 ? (
          <LoadingBlock />
        ) : error && assets.length === 0 ? (
          <EmptyState
            title={tAssets('errorLoadingAssets')}
            description={error}
            action={
              <Button variant="secondary" onClick={handleAssetsChange}>
                {tAssets('tryAgain')}
              </Button>
            }
          />
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
