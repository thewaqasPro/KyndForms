import { IconFileText } from '@tabler/icons-react'

import { AppService, FormService } from '@/services'
import { useParam } from '@/utils'

import { Async, Button, Repeat } from '@/components'
import { useAppStore, useFormStore } from '@/store'

import DeliveryLogsModal from './DeliveryLogsModal'
import IntegrationItem from './IntegrationItem'
import IntegrationSettingsModal from './IntegrationSettingsModal'

const Skeleton = (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
    <Repeat count={5}>
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
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {integratedApps.map(app => (
              <IntegrationItem key={app.id} app={app} />
            ))}
          </ul>
        </Async>
      </div>

      <IntegrationSettingsModal />
      <DeliveryLogsModal />
    </>
  )
}
