'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { Button, CheckField, SelectField, TextAreaField, TextField, hintClass, inputClass, labelClass } from '@/components/forms/fields'
import TagAutocompleteInput from '@/components/shared/TagAutocompleteInput'
import { groupsApi, listOrgUsers, type Group, type OrgUser } from '@/lib/groupsApi'
import { DEFAULT_SMART_FOLDER_COLOR, type CreateSmartFolderData, type SmartFolder, type SmartFolderVisibility } from '@/lib/smartFoldersApi'
import Modal from '@/components/ui/Modal'

interface SmartFolderFormProps {
  folder?: SmartFolder | null
  onSubmit: (data: CreateSmartFolderData) => Promise<void> | void
  onClose: () => void
}


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
  const [color, setColor] = useState(folder?.color || DEFAULT_SMART_FOLDER_COLOR)
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

  const formId = useId()

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
    <Modal
      title={folder ? t('form.editTitle') : t('form.createTitle')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? t('form.saving') : folder ? t('form.update') : t('form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="sf-name"
          label={`${t('form.nameLabel')} *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
        />
        <TextAreaField
          id="sf-description"
          label={t('form.descriptionLabel')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
        />

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
            <p className="mt-1 text-xs text-danger-text" role="alert">
              {t('form.noTagsBody')}
            </p>
          )}
        </div>

        <fieldset>
          <legend className={labelClass}>{t('form.matchLogicLabel')} *</legend>
          <div className="space-y-2">
            {(['any', 'all'] as const).map((value) => (
              <CheckField
                key={value}
                type="radio"
                name="match_logic"
                value={value}
                checked={matchLogic === value}
                onChange={() => setMatchLogic(value)}
                label={value === 'any' ? t('form.matchAnyLabel') : t('form.matchAllLabel')}
              />
            ))}
          </div>
        </fieldset>

        <SelectField
          id="sf-visibility"
          label={`${t('form.visibilityLabel')} *`}
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value as SmartFolderVisibility)
            setGroupId(null)
            setSharedUserIds([])
          }}
        >
          <option value="personal">{t('form.visibilityPersonal')}</option>
          <option value="group">{t('form.visibilityGroup')}</option>
          <option value="global">{t('form.visibilityGlobal')}</option>
        </SelectField>

        {visibility === 'group' && (
          <SelectField
            id="sf-group"
            label={`${t('form.selectGroupLabel')} *`}
            hint={groups.length === 0 ? t('form.noGroups') : undefined}
            value={groupId ?? ''}
            onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
            required
          >
            <option value="">{t('form.selectGroupPlaceholder')}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </SelectField>
        )}

        {visibility === 'personal' && (
          <SelectField
            id="sf-share"
            label={t('form.shareUsersLabel')}
            hint={t('form.shareUsersHint')}
            multiple
            value={sharedUserIds.map(String)}
            onChange={(e) => setSharedUserIds(Array.from(e.target.selectedOptions, (o) => Number(o.value)))}
            size={5}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </SelectField>
        )}

        <div>
          <label htmlFor="sf-color" className={labelClass}>
            {t('form.folderColorLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 shrink-0 cursor-pointer rounded-control border border-line-strong bg-surface p-0.5"
              aria-label={t('form.folderColorLabel')}
            />
            <input
              id="sf-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder={DEFAULT_SMART_FOLDER_COLOR}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
          <p className={hintClass}>{t('form.folderColorHint')}</p>
        </div>

        <CheckField label={t('form.pinLabel')} checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        <CheckField label={t('form.activeLabel')} checked={active} onChange={(e) => setActive(e.target.checked)} />

        <TextField
          id="sf-sort"
          label={t('form.sortOrderLabel')}
          hint={t('form.sortOrderHint')}
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          min={0}
        />
      </form>
    </Modal>
  )
}
