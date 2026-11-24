'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { XMarkIcon } from '@heroicons/react/24/outline'

import TagAutocompleteInput from '@/components/shared/TagAutocompleteInput'
import { groupsApi, listOrgUsers, type Group, type OrgUser } from '@/lib/groupsApi'
import type { CreateSmartFolderData, SmartFolder, SmartFolderVisibility } from '@/lib/smartFoldersApi'

interface SmartFolderFormProps {
  folder?: SmartFolder | null
  onSubmit: (data: CreateSmartFolderData) => Promise<void> | void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'

function splitTags(criteria: string): string[] {
  return criteria
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export default function SmartFolderForm({ folder, onSubmit, onClose }: SmartFolderFormProps) {
  const t = useTranslations('smartFolders')
  const tCommon = useTranslations('common')
  const [name, setName] = useState(folder?.name ?? '')
  const [description, setDescription] = useState(folder?.description ?? '')
  const [tags, setTags] = useState<string[]>(folder ? splitTags(folder.tag_criteria) : [])
  const [matchLogic, setMatchLogic] = useState<'any' | 'all'>(folder?.match_logic ?? 'any')
  const [visibility, setVisibility] = useState<SmartFolderVisibility>(folder?.visibility_level ?? 'personal')
  const [groupId, setGroupId] = useState<number | null>(folder?.group_id ?? null)
  const [sharedUserIds, setSharedUserIds] = useState<number[]>(folder?.shared_user_ids ?? [])
  const [color, setColor] = useState(folder?.color || '#A88BEA')
  const [pinned, setPinned] = useState(folder?.pinned_to_sidebar ?? false)
  const [active, setActive] = useState(folder?.active ?? true)
  const [sortOrder, setSortOrder] = useState(folder?.sort_order ?? 0)
  const [saving, setSaving] = useState(false)
  const [tagsError, setTagsError] = useState(false)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    listOrgUsers().then(setUsers).catch(() => setUsers([]))
    groupsApi.list().then(setGroups).catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (tags.length === 0) {
      setTagsError(true)
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        tag_criteria: tags.join(', '),
        match_logic: matchLogic,
        visibility_level: visibility,
        group_id: visibility === 'group' ? groupId : null,
        shared_user_ids: visibility === 'personal' ? sharedUserIds : [],
        color,
        pinned_to_sidebar: pinned,
        active,
        sort_order: sortOrder,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-folder-form-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 id="smart-folder-form-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {folder ? t('form.editTitle') : t('form.createTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label={tCommon('close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="sf-name" className={labelClass}>
              {t('form.nameLabel')} *
            </label>
            <input
              id="sf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={t('form.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label htmlFor="sf-description" className={labelClass}>
              {t('form.descriptionLabel')}
            </label>
            <textarea
              id="sf-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder={t('form.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div>
            <TagAutocompleteInput
              tags={tags}
              onTagsChange={(next) => {
                setTags(next)
                setTagsError(false)
              }}
              label={`${t('form.tagsLabel')} *`}
              hint={matchLogic === 'all' ? t('form.tagsHelperAll') : t('form.tagsHelperAny')}
              placeholder={t('form.tagsInputPlaceholder')}
              addButtonLabel={t('form.addTags')}
            />
            {tagsError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('form.noTagsBody')}
              </p>
            )}
          </div>

          <fieldset>
            <legend className={labelClass}>{t('form.matchLogicLabel')} *</legend>
            <div className="space-y-2">
              {(['any', 'all'] as const).map((value) => (
                <label key={value} className="flex items-center">
                  <input
                    type="radio"
                    name="match_logic"
                    value={value}
                    checked={matchLogic === value}
                    onChange={() => setMatchLogic(value)}
                    className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {value === 'any' ? t('form.matchAnyLabel') : t('form.matchAllLabel')}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="sf-visibility" className={labelClass}>
              {t('form.visibilityLabel')} *
            </label>
            <select
              id="sf-visibility"
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as SmartFolderVisibility)
                setGroupId(null)
                setSharedUserIds([])
              }}
              className={inputClass}
            >
              <option value="personal">{t('form.visibilityPersonal')}</option>
              <option value="group">{t('form.visibilityGroup')}</option>
              <option value="global">{t('form.visibilityGlobal')}</option>
            </select>
          </div>

          {visibility === 'group' && (
            <div>
              <label htmlFor="sf-group" className={labelClass}>
                {t('form.selectGroupLabel')} *
              </label>
              <select
                id="sf-group"
                value={groupId ?? ''}
                onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
                required
              >
                <option value="">{t('form.selectGroupPlaceholder')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {groups.length === 0 && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('form.noGroups')}</p>}
            </div>
          )}

          {visibility === 'personal' && (
            <div>
              <label htmlFor="sf-share" className={labelClass}>
                {t('form.shareUsersLabel')}
              </label>
              <select
                id="sf-share"
                multiple
                value={sharedUserIds.map(String)}
                onChange={(e) => setSharedUserIds(Array.from(e.target.selectedOptions, (o) => Number(o.value)))}
                className={inputClass}
                size={5}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('form.shareUsersHint')}</p>
            </div>
          )}

          <div>
            <label htmlFor="sf-color" className={labelClass}>
              {t('form.folderColorLabel')}
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                aria-label={t('form.folderColorLabel')}
              />
              <input
                id="sf-color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={`${inputClass} flex-1 font-mono text-sm`}
                placeholder="#A88BEA"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('form.folderColorHint')}</p>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('form.pinLabel')}</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('form.activeLabel')}</span>
          </label>

          <div>
            <label htmlFor="sf-sort" className={labelClass}>
              {t('form.sortOrderLabel')}
            </label>
            <input
              id="sf-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className={inputClass}
              min={0}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('form.sortOrderHint')}</p>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? t('form.saving') : folder ? t('form.update') : t('form.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
