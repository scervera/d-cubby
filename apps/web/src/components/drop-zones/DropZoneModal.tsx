'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'

import ModalShell from '@/components/groups/ModalShell'
import TagAutocompleteInput from '@/components/shared/TagAutocompleteInput'
import { DROP_ZONE_FILE_TYPES, type DropZone, type DropZoneFileType, type DropZoneInput } from '@/lib/dropZonesApi'

interface DropZoneModalProps {
  dropZone?: DropZone | null
  onClose: () => void
  /** Resolves with error messages to show, or nothing on success. */
  onSave: (input: DropZoneInput) => Promise<string[] | void>
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'

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
    <ModalShell title={dropZone ? t('modal.editTitle') : t('modal.createTitle')} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
            <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label htmlFor="dz-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('modal.nameLabel')} *
          </label>
          <input
            id="dz-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={t('modal.namePlaceholder')}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="dz-description" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('modal.descriptionLabel')}
          </label>
          <textarea
            id="dz-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder={t('modal.descriptionPlaceholder')}
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.acceptedFileTypesLabel')}</legend>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{t('modal.acceptedFileTypesHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            {DROP_ZONE_FILE_TYPES.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={fileTypes.includes(value)}
                  onChange={(e) =>
                    setFileTypes((prev) => (e.target.checked ? [...prev, value] : prev.filter((type) => type !== value)))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{fileTypeLabels[value]}</span>
              </label>
            ))}
          </div>
          {fileTypes.length === 0 && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('modal.fileTypeRequired')}</p>}
        </fieldset>

        <TagAutocompleteInput
          tags={presetTags}
          onTagsChange={setPresetTags}
          label={t('modal.presetTagsLabel')}
          hint={t('modal.presetTagsHint')}
          placeholder={t('modal.tagPlaceholder')}
          addButtonLabel={t('modal.addTag')}
        />

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('modal.activeLabel')}</span>
        </label>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex">
            <Info className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="mb-1 font-medium">{t('modal.howItWorksTitle')}</p>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• {t('modal.howItWorks1')}</li>
                <li>• {t('modal.howItWorks2')}</li>
                <li>• {t('modal.howItWorks3')}</li>
                <li>• {t('modal.howItWorks4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('modal.saving') : dropZone ? t('modal.update') : t('modal.create')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
