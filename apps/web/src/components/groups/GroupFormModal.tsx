'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import type { Group, GroupInput } from '@/lib/groupsApi'
import ModalShell from './ModalShell'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'

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
          <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="group-description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('form.activeLabel')}</span>
        </label>
        <div className="flex items-center justify-end space-x-3 pt-4">
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
            {group ? t('form.update') : t('form.create')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
