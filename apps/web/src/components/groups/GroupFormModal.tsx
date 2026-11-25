'use client'

import { useId, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import type { Group, GroupInput } from '@/lib/groupsApi'
import { Button, CheckField, TextAreaField, TextField } from '@/components/forms/fields'
import Modal from '@/components/ui/Modal'

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
  const formId = useId()

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
    <Modal
      title={group ? t('form.editTitle') : t('form.createTitle')}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {group ? t('form.update') : t('form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="group-name"
          label={`${t('form.nameLabel')} *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
          autoFocus
        />
        <TextAreaField
          id="group-description"
          label={t('form.descriptionLabel')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
        />
        <CheckField label={t('form.activeLabel')} checked={active} onChange={(e) => setActive(e.target.checked)} />
      </form>
    </Modal>
  )
}
