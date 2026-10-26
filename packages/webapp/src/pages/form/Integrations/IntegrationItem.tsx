import {
  IconAlertTriangle,
  IconHistory,
  IconLink,
  IconPencil,
  IconTrash
} from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getIntegrationDescription } from './utils'
import { IntegrationService } from '@/services'
import { useParam } from '@/utils'
import { helper } from '@kyndform/utils'

import { Badge, Button, Image, Switch, Tooltip } from '@/components'
import { APP_STATUS_ENUM, INTEGRATION_STATUS_ENUM } from '@/consts'
import { useAppStore, useFormStore } from '@/store'
import { IntegratedAppType } from '@/types'

interface IntegrationItemProps {
  app: IntegratedAppType
}

const IntegrationItem: FC<IntegrationItemProps> = ({ app }) => {
  const { t } = useTranslation()

  const { formId } = useParam()
  const { openModal } = useAppStore()
  const { updateIntegration, deleteIntegration } = useFormStore()
  const [hasIconError, setHasIconError] = useState(false)

  const active = useMemo(
    () =>
      helper.isValid(app.integration?.config) &&
      app.integration?.status === INTEGRATION_STATUS_ENUM.ACTIVE,
    [app.integration?.config, app.integration?.status]
  )

  const { loading: toggleLoading, run: toggleRun } = useRequest(
    async (checked: boolean) => {
      const status = checked ? INTEGRATION_STATUS_ENUM.ACTIVE : INTEGRATION_STATUS_ENUM.DISABLED

      await IntegrationService.updateStatus(formId, app.id, status)
      updateIntegration(app.id, { status })
    },
    {
      manual: true,
      refreshDeps: [formId, app.id]
    }
  )

  const { loading: deleteLoading, run: deleteRun } = useRequest(
    async () => {
      await IntegrationService.deleteSettings(formId, app.id)
      deleteIntegration(app.id)
    },
    {
      manual: true,
      refreshDeps: [formId, app.id]
    }
  )

  function handleConnect() {
    openModal('IntegrationSettingsModal', { app })
  }

  function handleEdit() {
    openModal('IntegrationSettingsModal', {
      app: {
        ...app,
        isAuthorized: true
      }
    })
  }

  const children = useMemo(() => {
    switch (app.status) {
      case APP_STATUS_ENUM.ACTIVE:
        return (
          <div className="flex items-center gap-x-1">
            <Switch value={active} loading={toggleLoading} onChange={toggleRun} />

            <Tooltip label={t('components.edit')}>
              <Button.Link size="sm" iconOnly onClick={handleEdit}>
                <IconPencil className="h-5 w-5" />
              </Button.Link>
            </Tooltip>

            <Tooltip label={t('components.delete')}>
              <Button.Link size="sm" loading={deleteLoading} iconOnly onClick={deleteRun}>
                <IconTrash className="h-5 w-5" />
              </Button.Link>
            </Tooltip>
          </div>
        )

      case APP_STATUS_ENUM.PENDING:
        return (
          <Button size="sm" onClick={handleConnect}>
            {t('form.integrations.connect')}
          </Button>
        )
    }
  }, [handleConnect, t, deleteLoading])

  function handleOpenLogs() {
    openModal('DeliveryLogsModal', {
      app,
      integrationId: app.integration?.id
    })
  }

  const statusBadge = useMemo(() => {
    if (app.status !== APP_STATUS_ENUM.ACTIVE || !app.integration) return null

    if (app.integration.status === INTEGRATION_STATUS_ENUM.BROKEN) {
      return (
        <Tooltip
          label={
            app.integration.lastErrorMessage ||
            'Integration circuit breaker tripped due to consecutive delivery failures.'
          }
        >
          <span>
            <Badge color="red" className="cursor-help">
              <IconAlertTriangle className="mr-1 inline h-3 w-3" />
              Broken
            </Badge>
          </span>
        </Tooltip>
      )
    }

    if (app.integration.status === INTEGRATION_STATUS_ENUM.DEGRADED) {
      return (
        <Tooltip
          label={`Recent delivery attempts failed (${app.integration.consecutiveFailures} consecutive). KyndForm is retrying.`}
        >
          <span>
            <Badge color="amber" className="cursor-help">
              Degraded
            </Badge>
          </span>
        </Tooltip>
      )
    }

    if (active) {
      return <Badge color="green">Active</Badge>
    }

    return null
  }, [app.status, app.integration, active])

  return (
    <li className="hf-card border-input flex cursor-default flex-col justify-between rounded-lg border px-6 py-6 text-sm">
      <div>
        <div className="flex items-center justify-between">
          {!hasIconError && helper.isValid(app.icon) ? (
            <Image
              className="border-accent-light h-8 w-8 rounded-lg border"
              src={app.icon}
              onError={() => setHasIconError(true)}
            />
          ) : (
            <div className="border-accent-light bg-accent-light text-secondary flex h-8 w-8 items-center justify-center rounded-lg border">
              <IconLink className="h-4 w-4" />
            </div>
          )}
          {children}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="font-medium text-gray-900 dark:text-gray-100">{app.name}</div>
          {statusBadge}
        </div>
        <div className="text-secondary mt-1 text-xs">{getIntegrationDescription(t, app)}</div>
      </div>

      {app.status === APP_STATUS_ENUM.ACTIVE && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <Button.Link
            size="sm"
            onClick={handleOpenLogs}
            className="text-primary flex items-center gap-1 !p-0 text-xs font-medium hover:underline"
          >
            <IconHistory className="h-3.5 w-3.5" />
            Delivery Logs
          </Button.Link>
          {app.integration?.lastFailureAt && (
            <span className="text-[11px] text-red-500">Failed recently</span>
          )}
        </div>
      )}
    </li>
  )
}

export default IntegrationItem
