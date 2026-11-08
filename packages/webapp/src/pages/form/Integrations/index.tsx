import { IconCircleCheck, IconFileText, IconPlug } from '@tabler/icons-react'
import { useMemo } from 'react'

import { AppService, FormService } from '@/services'
import { useParam } from '@/utils'

import { Async, Button, Repeat } from '@/components'
import { APP_STATUS_ENUM } from '@/consts'
import { useAppStore, useFormStore } from '@/store'

import DeliveryLogsModal from './DeliveryLogsModal'
import IntegrationItem from './IntegrationItem'
import IntegrationSettingsModal from './IntegrationSettingsModal'

const Skeleton = (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
    <Repeat count={6}>
      <div className="border-input cursor-default rounded-lg border px-4 py-6 text-sm">
        <div className="flex items-center justify-between">
          <div className="skeleton border-accent-light h-8 w-8 rounded-lg border" />
          <div className="skeleton h-8 w-14 rounded-lg"></div>
        </div>
        <div className="mt-2 py-[0.1875rem]">
          <div className="skeleton h-3.5 w-20 rounded-sm"></div>
        </div>
        <div className="mt-1 py-[0.1875rem]">
          <div className="skeleton h-3.5 w-full rounded-sm"></div>
        </div>
        <div className="mt-0.5 py-[0.1875rem]">
          <div className="skeleton h-3.5 w-2/5 rounded-sm"></div>
        </div>
      </div>
    </Repeat>
  </div>
)

export default function FormIntegrations() {
  const { formId } = useParam()
  const { integratedApps, setApps, setIntegrations } = useFormStore()
  const { openModal } = useAppStore()

  async function fetch() {
    const [apps, integrations] = await Promise.all([
      AppService.apps(),
      FormService.integrations(formId)
    ])

    setApps(apps)
    setIntegrations(integrations)

    return true
  }

  function handleViewAllLogs() {
    openModal('DeliveryLogsModal', { formId })
  }

  const activeApps = useMemo(
    () => integratedApps.filter(app => app.status === APP_STATUS_ENUM.ACTIVE),
    [integratedApps]
  )

  const availableApps = useMemo(
    () => integratedApps.filter(app => app.status !== APP_STATUS_ENUM.ACTIVE),
    [integratedApps]
  )

  return (
    <>
      <div className="mt-8 space-y-6 px-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Integrations & Webhooks
            </h1>
            <p className="text-secondary mt-1 text-xs">
              Connect external apps, automatically receive Zapier-style failure alerts, and replay
              failed submissions.
            </p>
          </div>
          <Button.Ghost size="sm" onClick={handleViewAllLogs} className="flex items-center gap-1.5">
            <IconFileText className="h-4 w-4" />
            View Delivery Logs
          </Button.Ghost>
        </div>

        <Async fetch={fetch} refreshDeps={[formId]} loader={Skeleton}>
          <div className="space-y-8">
            {activeApps.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconCircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Active Integrations
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {activeApps.length} active
                    </span>
                  </div>
                  <span className="text-secondary text-xs">Connected and active for this form</span>
                </div>
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {activeApps.map(app => (
                    <IntegrationItem key={app.id} app={app} />
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <IconPlug className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {activeApps.length > 0 ? 'Available Integrations' : 'All Integrations'}
                  </h2>
                  <span className="text-secondary text-xs">({availableApps.length})</span>
                </div>
                <span className="text-secondary text-xs">
                  Connect additional apps to automate workflows
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {availableApps.map(app => (
                  <IntegrationItem key={app.id} app={app} />
                ))}
              </ul>
            </section>
          </div>
        </Async>
      </div>

      <IntegrationSettingsModal />
      <DeliveryLogsModal />
    </>
  )
}
