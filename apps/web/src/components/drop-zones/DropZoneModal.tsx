'use client'

import { useId, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { Button, CheckField, TextAreaField, TextField } from '@/components/forms/fields'
import Modal from '@/components/ui/Modal'
import TagAutocompleteInput from '@/components/shared/TagAutocompleteInput'
import { DROP_ZONE_FILE_TYPES, type DropZone, type DropZoneFileType, type DropZoneInput } from '@/lib/dropZonesApi'

interface DropZoneModalProps {
  dropZone?: DropZone | null
  onClose: () => void
  /** Resolves with error messages to show, or nothing on success. */
  onSave: (input: DropZoneInput) => Promise<string[] | void>
}

export default function DropZoneModal({ dropZone, onClose, onSave }: DropZoneModalProps) {
  const t = useTranslations('dropZones')
  const tCommon = useTranslations('common')
  const [name, setName] = useState(dropZone?.name ?? '')
  const [description, setDescription] = useState(dropZone?.description ?? '')
  const [presetTags, setPresetTags] = useState<string[]>(dropZone?.preset_tags ?? [])
  const [fileTypes, setFileTypes] = useState<DropZoneFileType[]>(dropZone?.accepted_file_types ?? DROP_ZONE_FILE_TYPES)
  const [isActive, setIsActive] = useState(dropZone?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const formId = useId()

  const fileTypeLabels: Record<DropZoneFileType, string> = {
    image: t('modal.fileTypeImages'),
    video: t('modal.fileTypeVideos'),
    audio: t('modal.fileTypeAudio'),
    document: t('modal.fileTypeDocuments'),
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (fileTypes.length === 0) {
      setErrors([t('modal.selectFileTypeError')])
      return
    }
    setSaving(true)
    setErrors([])
    const result = await onSave({
      name: name.trim(),
      description: description.trim(),
      preset_tags: presetTags,
      accepted_file_types: fileTypes,
      is_active: isActive,
    })
    setSaving(false)
    if (result && result.length > 0) setErrors(result)
    else onClose()
  }

  return (
    <Modal
      title={dropZone ? t('modal.editTitle') : t('modal.createTitle')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? t('modal.saving') : dropZone ? t('modal.update') : t('modal.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger-text" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <TextField
          id="dz-name"
          label={`${t('modal.nameLabel')} *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('modal.namePlaceholder')}
          required
          autoFocus
        />
        <TextAreaField
          id="dz-description"
          label={t('modal.descriptionLabel')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('modal.descriptionPlaceholder')}
        />

        <fieldset>
          <legend className="text-sm font-medium text-fg">{t('modal.acceptedFileTypesLabel')}</legend>
          <p className="mt-1 mb-3 text-xs text-subtle">{t('modal.acceptedFileTypesHint')}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {DROP_ZONE_FILE_TYPES.map((value) => (
              <CheckField
                key={value}
                label={fileTypeLabels[value]}
                checked={fileTypes.includes(value)}
                onChange={(e) =>
                  setFileTypes((prev) => (e.target.checked ? [...prev, value] : prev.filter((type) => type !== value)))
                }
              />
            ))}
          </div>
          {fileTypes.length === 0 && <p className="mt-2 text-xs text-danger-text">{t('modal.fileTypeRequired')}</p>}
        </fieldset>

        <TagAutocompleteInput
          tags={presetTags}
          onTagsChange={setPresetTags}
          label={t('modal.presetTagsLabel')}
          hint={t('modal.presetTagsHint')}
          placeholder={t('modal.tagPlaceholder')}
          addButtonLabel={t('modal.addTag')}
        />

        <CheckField label={t('modal.activeLabel')} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />

        <div className="rounded-control bg-accent-subtle px-3 py-2.5 text-sm text-fg">
          <p className="font-medium">{t('modal.howItWorksTitle')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            <li>{t('modal.howItWorks1')}</li>
            <li>{t('modal.howItWorks2')}</li>
            <li>{t('modal.howItWorks3')}</li>
            <li>{t('modal.howItWorks4')}</li>
          </ul>
        </div>
      </form>
    </Modal>
  )
}
