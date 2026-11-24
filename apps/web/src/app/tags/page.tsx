'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, TrashIcon } from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { apiErrorMessage } from '@/lib/api'
import { canWrite, isAdmin } from '@/lib/auth/permissions'
import { tagsApi, type Tag } from '@/lib/tagsApi'
import { toast } from '@/lib/toast'

export default function TagsPage() {
  const { ready, user } = useRequireAuth()
  const router = useRouter()
  const t = useTranslations('tags')
  const tCommon = useTranslations('common')
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)

  const writer = canWrite(user)
  // The API lets admins delete any tag. (It also intends to let editors delete tags on
  // their own assets, but that check currently errors, so only admins get the button.)
  const admin = isAdmin(user)

  const fetchTags = useCallback(async () => {
    try {
      setTags(await tagsApi.listAll())
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (ready) fetchTags()
  }, [ready, fetchTags])

  const handleCreateTag = async (e: FormEvent) => {
    e.preventDefault()
    const name = newTagName.trim()
    if (!name) {
      toast.error(t('toasts.nameRequired'))
      return
    }
    setCreating(true)
    try {
      const tag = await tagsApi.create(name)
      setTags((prev) =>
        prev.some((existing) => existing.id === tag.id)
          ? prev
          : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setNewTagName('')
      setShowCreateForm(false)
      toast.success(t('toasts.created', { name: tag.name }))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.createFailed')))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTag = async () => {
    if (!deletingTag) return
    setDeleting(true)
    try {
      await tagsApi.delete(deletingTag.id)
      setTags((prev) => prev.filter((tag) => tag.id !== deletingTag.id))
      setSelectedTagIds((prev) => {
        const next = new Set(prev)
        next.delete(deletingTag.id)
        return next
      })
      toast.success(t('toasts.deleted', { name: deletingTag.name }))
      setDeletingTag(null)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  const toggleTagSelection = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  // The asset browser filters by ?tag_ids= (assets with ANY of the tags) and shows ?q= in
  // its search box.
  const goToAssetsWithTags = () => {
    if (selectedTagIds.size === 0) return
    const selected = tags.filter((tag) => selectedTagIds.has(tag.id))
    const params = new URLSearchParams()
    params.set('tag_ids', selected.map((tag) => tag.id).join(','))
    params.set('q', selected.map((tag) => tag.name).join(' '))
    router.push(`/assets?${params}`)
  }

  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="tags">
      <div className="flex h-full flex-col">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E3E1CE]">{t('title')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('subtitle')}
              {!loading && tags.length > 0 ? ` · ${tags.length}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedTagIds.size > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('selectedCount', { count: selectedTagIds.size })}</span>
            )}
            <button
              type="button"
              onClick={goToAssetsWithTags}
              disabled={selectedTagIds.size === 0}
              className="flex items-center gap-2 rounded-xl border border-indigo-500 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition-transform hover:-translate-y-0.5 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-400 dark:bg-transparent dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              {t('searchButton')}
            </button>
            {writer && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true)
                  setNewTagName('')
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-indigo-600"
              >
                <PlusIcon className="h-5 w-5" />
                {t('createButton')}
              </button>
            )}
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6 rounded-2xl border border-white/20 bg-white/15 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-[#E3E1CE]">{t('form.createTitle')}</h2>
            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label htmlFor="tag-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('form.nameLabel')}
                </label>
                <input
                  id="tag-name"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t('form.namePlaceholder')}
                  className="mt-1 w-full rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50"
                >
                  {t('form.createButton')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-slate-500 dark:text-slate-400">{tCommon('loading')}</div>
          </div>
        ) : tags.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
            <TagIcon className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">{t('emptyTitle')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{t('emptyBody')}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('selectTagsHint')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id)
                return (
                  <div
                    key={tag.id}
                    className={`group relative rounded-2xl border backdrop-blur transition-all hover:shadow-lg dark:bg-slate-800/50 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40 dark:ring-indigo-400'
                        : 'border-white/20 bg-white/15 hover:border-indigo-300 dark:border-white/10 dark:hover:border-indigo-600'
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleTagSelection(tag.id)}
                      className="flex w-full items-center gap-2 p-6 pr-20 text-left"
                    >
                      <TagIcon className="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                      <span className="truncate text-lg font-semibold text-slate-900 dark:text-[#E3E1CE]">{tag.name}</span>
                    </button>
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      {isSelected && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <CheckIcon className="h-4 w-4" />
                        </span>
                      )}
                      {admin && (
                        <button
                          type="button"
                          onClick={() => setDeletingTag(tag)}
                          className="rounded-lg p-1.5 text-slate-400 opacity-100 transition-opacity hover:text-red-500 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100 dark:text-slate-500 dark:hover:text-red-400"
                          title={t('deleteTooltip')}
                          aria-label={t('deleteTooltip')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingTag}
        title={t('deleteTooltip')}
        body={deletingTag ? t('confirmDelete', { name: deletingTag.name }) : ''}
        cancelLabel={tCommon('cancel')}
        confirmLabel={t('deleteTooltip')}
        loading={deleting}
        onCancel={() => setDeletingTag(null)}
        onConfirm={handleDeleteTag}
      />
    </SharedLayout>
  )
}
