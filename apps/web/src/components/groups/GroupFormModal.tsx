'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import type { Group, GroupInput } from '@/lib/groupsApi'
import ModalShell from './ModalShell'

const inputClass =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-fg'

export default function GroupFormModal({
  group,
  onSubmit,
  onClose,
}: {
  group: Group | null
  onSubmit: (input: GroupInput) => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations('groups')
  const tCommon = useTranslations('common')
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [active, setActive] = useState(group?.active ?? true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), active })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={group ? t('form.editTitle') : t('form.createTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-muted">
            {t('form.nameLabel')} *
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={t('form.namePlaceholder')}
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="group-description" className="mb-1 block text-sm font-medium text-muted">
            {t('form.descriptionLabel')}
          </label>
          <textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder={t('form.descriptionPlaceholder')}
            rows={3}
          />
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-line text-accent-text"
          />
          <span className="ml-2 text-sm text-muted">{t('form.activeLabel')}</span>
        </label>
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control bg-sunken px-4 py-2 font-medium text-muted hover:bg-hover"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-control bg-accent px-4 py-2 font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            {group ? t('form.update') : t('form.create')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
