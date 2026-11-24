'use client'

import { useTranslations } from 'next-intl'

import IntegrationStatusList from '@/components/settings/IntegrationStatusList'
import SettingsPage, { Panel } from '@/components/settings/SettingsPage'

export default function SystemSettingsPage() {
  const t = useTranslations('settings.system')
  return (
    <SettingsPage title={t('title')} description={t('description')}>
      <Panel>
        <IntegrationStatusList />
      </Panel>
    </SettingsPage>
  )
}
