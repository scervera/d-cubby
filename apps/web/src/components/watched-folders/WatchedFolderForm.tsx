'use client'

import { useId, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { Button, CheckField, SelectField, TextField } from '@/components/forms/fields'
import Modal from '@/components/ui/Modal'
import type { ScanFrequencyUnit, WatchedFolder, WatchedFolderInput } from '@/lib/watchedFoldersApi'

const GB = 1024 * 1024 * 1024

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
  const formId = useId()

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
    <Modal
      title={folder ? t('form.editTitle') : t('form.createTitle')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {folder ? t('form.update') : t('form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <TextField id="wf-name" label={t('form.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <TextField
          id="wf-path"
          label={t('form.pathLabel')}
          hint={t('form.pathHint')}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/watched/photos"
          mono
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="wf-frequency"
            label={t('form.frequencyLabel')}
            type="number"
            min={1}
            max={999}
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value, 10) || 1)}
            required
          />
          <SelectField id="wf-unit" label={t('form.unitLabel')} value={unit} onChange={(e) => setUnit(e.target.value as ScanFrequencyUnit)}>
            <option value="minutes">{t('form.minutes')}</option>
            <option value="hours">{t('form.hours')}</option>
            <option value="days">{t('form.days')}</option>
          </SelectField>
        </div>
        <TextField
          id="wf-max"
          label={t('form.maxFileSizeLabel')}
          type="number"
          min={1}
          max={100}
          value={maxSizeGb}
          onChange={(e) => setMaxSizeGb(parseInt(e.target.value, 10) || 1)}
          required
        />
        <TextField
          id="wf-tags"
          label={t('form.autoTagsLabel')}
          hint={t('form.autoTagsHint')}
          value={autoTags}
          onChange={(e) => setAutoTags(e.target.value)}
          placeholder={t('form.autoTagsPlaceholder')}
        />
        <CheckField label={t('form.activeLabel')} checked={active} onChange={(e) => setActive(e.target.checked)} />
      </form>
    </Modal>
  )
}
