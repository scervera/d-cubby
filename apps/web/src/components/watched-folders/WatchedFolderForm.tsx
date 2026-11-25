'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import ModalShell from '@/components/groups/ModalShell'
import type { ScanFrequencyUnit, WatchedFolder, WatchedFolderInput } from '@/lib/watchedFoldersApi'

const GB = 1024 * 1024 * 1024
const inputClass =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-fg'
const labelClass = 'mb-1 block text-sm font-medium text-muted'
const hintClass = 'mt-1 text-xs text-subtle'

/** Create or edit a watched folder. */
export default function WatchedFolderForm({
  folder,
  onSubmit,
  onClose,
}: {
  folder: WatchedFolder | null
  onSubmit: (input: WatchedFolderInput) => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations('watchedFolders')
  const tCommon = useTranslations('common')
  const [name, setName] = useState(folder?.name ?? '')
  const [path, setPath] = useState(folder?.path ?? '/watched/')
  const [frequency, setFrequency] = useState(folder?.scan_frequency_value ?? 5)
  const [unit, setUnit] = useState<ScanFrequencyUnit>(folder?.scan_frequency_unit ?? 'minutes')
  const [maxSizeGb, setMaxSizeGb] = useState(folder ? Math.max(1, Math.round(folder.max_file_size_bytes / GB)) : 10)
  const [autoTags, setAutoTags] = useState(folder?.auto_tags ?? '')
  const [active, setActive] = useState(folder?.active ?? true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        path: path.trim(),
        scan_frequency_value: frequency,
        scan_frequency_unit: unit,
        max_file_size_bytes: maxSizeGb * GB,
        auto_tags: autoTags.trim(),
        active,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={folder ? t('form.editTitle') : t('form.createTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label htmlFor="wf-name" className={labelClass}>
            {t('form.nameLabel')}
          </label>
          <input id="wf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required autoFocus />
        </div>

        <div>
          <label htmlFor="wf-path" className={labelClass}>
            {t('form.pathLabel')}
          </label>
          <input
            id="wf-path"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className={`${inputClass} font-mono text-sm`}
            placeholder="/watched/photos"
            required
          />
          <p className={hintClass}>{t('form.pathHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="wf-frequency" className={labelClass}>
              {t('form.frequencyLabel')}
            </label>
            <input
              id="wf-frequency"
              type="number"
              min={1}
              max={999}
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="wf-unit" className={labelClass}>
              {t('form.unitLabel')}
            </label>
            <select id="wf-unit" value={unit} onChange={(e) => setUnit(e.target.value as ScanFrequencyUnit)} className={inputClass}>
              <option value="minutes">{t('form.minutes')}</option>
              <option value="hours">{t('form.hours')}</option>
              <option value="days">{t('form.days')}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="wf-max" className={labelClass}>
            {t('form.maxFileSizeLabel')}
          </label>
          <input
            id="wf-max"
            type="number"
            min={1}
            max={100}
            value={maxSizeGb}
            onChange={(e) => setMaxSizeGb(parseInt(e.target.value, 10) || 1)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="wf-tags" className={labelClass}>
            {t('form.autoTagsLabel')}
          </label>
          <input
            id="wf-tags"
            type="text"
            value={autoTags}
            onChange={(e) => setAutoTags(e.target.value)}
            className={inputClass}
            placeholder={t('form.autoTagsPlaceholder')}
          />
          <p className={hintClass}>{t('form.autoTagsHint')}</p>
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

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-control border border-line px-4 py-2 text-muted transition-colors hover:bg-hover"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-control bg-accent px-4 py-2 text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {folder ? t('form.update') : t('form.create')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
