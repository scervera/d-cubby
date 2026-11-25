'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, TrashIcon } from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel'
import PageSpinner from '@/components/ui/PageSpinner'
import { LoadingBlock } from '@/components/ui/Spinner'
import { TextField } from '@/components/forms/fields'
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
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            {selectedTagIds.size > 0 && <span className="text-meta">{t('selectedCount', { count: selectedTagIds.size })}</span>}
            {writer && !showCreateForm && (
              <Button
                variant={selectedTagIds.size > 0 ? 'secondary' : 'primary'}
                onClick={() => {
                  setShowCreateForm(true)
                  setNewTagName('')
                }}
              >
                <PlusIcon className="h-4 w-4" aria-hidden />
                {t('createButton')}
              </Button>
            )}
            {(selectedTagIds.size > 0 || !writer) && (
              <Button onClick={goToAssetsWithTags} disabled={selectedTagIds.size === 0}>
                <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                {t('searchButton')}
              </Button>
            )}
          </>
        }
      />

      {showCreateForm && (
        <Panel title={t('form.createTitle')}>
          <form onSubmit={handleCreateTag} className="flex flex-wrap items-end gap-2">
            <TextField
              id="tag-name"
              label={t('form.nameLabel')}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              className="min-w-56 flex-1"
              autoFocus
            />
            <Button type="submit" loading={creating}>
              {t('form.createButton')}
            </Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
              {tCommon('cancel')}
            </Button>
          </form>
        </Panel>
      )}

      {loading ? (
        <LoadingBlock />
      ) : tags.length === 0 ? (
        <EmptyState icon={<TagIcon />} title={t('emptyTitle')} description={t('emptyBody')} />
      ) : (
        <>
          <p className="text-sm text-muted">{t('selectTagsHint')}</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.has(tag.id)
              return (
                <li
                  key={tag.id}
                  className={`flex items-center rounded-card border transition-colors duration-100 ${
                    isSelected ? 'border-accent bg-accent-subtle text-accent-text' : 'bg-surface text-fg hover:bg-hover'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleTagSelection(tag.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-card px-3 py-2.5 text-left text-sm font-medium"
                  >
                    {isSelected ? (
                      <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <TagIcon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                    )}
                    <span className="truncate">{tag.name}</span>
                  </button>
                  {admin && (
                    <IconButton
                      variant="danger-ghost"
                      size="sm"
                      className="mr-1.5"
                      onClick={() => setDeletingTag(tag)}
                      title={t('deleteTooltip')}
                      aria-label={t('deleteTooltip')}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

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
