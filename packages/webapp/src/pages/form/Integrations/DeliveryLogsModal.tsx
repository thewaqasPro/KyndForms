import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconFileText,
  IconRefresh,
  IconRotateClockwise2,
  IconX
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { IntegrationService } from '@/services'
import { useParam } from '@/utils'
import { date } from '@kyndform/utils'

import { Badge, Button, EmptyState, Loader, Modal } from '@/components'
import { useModal } from '@/store'

export interface DeliveryLogItem {
  id: string
  formId: string
  integrationId: string
  appId: string
  submissionId: string
  endpointUrl?: string
  responseStatus?: number
  responseBody?: string
  executionDurationMs?: number
  errorMessage?: string
  attempts: number
  status: string
  isAlertSent: boolean
  createdAt: string
}

export default function DeliveryLogsModal() {
  const { formId } = useParam()
  const { isOpen, payload, onOpenChange } = useModal('DeliveryLogsModal')

  const [loading, setLoading] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DeliveryLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<DeliveryLogItem | null>(null)

  const integrationId = payload?.integrationId
  const app = payload?.app

  async function fetchLogs() {
    if (!formId) return
    setLoading(true)
    try {
      const res = await IntegrationService.getLogs(formId, integrationId, 50, 0)
      if (res?.logs) {
        setLogs(res.logs as DeliveryLogItem[])
        setTotal(res.total)
      }
    } catch (err) {
      console.error('Failed to fetch delivery logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
      setSelectedLog(null)
    }
  }, [isOpen, formId, integrationId])

  async function handleRetry(log: DeliveryLogItem) {
    if (!formId || retryingId) return
    setRetryingId(log.id)
    try {
      const res = await IntegrationService.retryDelivery(formId, log.id)
      if (res) {
        await fetchLogs()
      }
    } catch (err) {
      console.error('Failed to retry integration delivery:', err)
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <Modal
      open={isOpen}
      contentProps={{
        className: 'max-w-4xl p-0 overflow-hidden',
        forceMount: true
      }}
      onOpenChange={onOpenChange}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <IconFileText className="text-primary h-5 w-5" />
            {app ? `${app.name} Delivery Logs` : 'Integration Delivery Logs'}
          </h2>
          <p className="text-secondary mt-0.5 text-xs">
            Real-time delivery attempts, latencies, responses, and retry capabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button.Ghost
            size="sm"
            loading={loading}
            onClick={fetchLogs}
            className="flex items-center gap-1.5"
          >
            <IconRefresh className="h-4 w-4" />
            Refresh
          </Button.Ghost>
        </div>
      </div>

      <div className="p-6">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="text-primary h-8 w-8" />
            <p className="text-secondary mt-3 text-sm">Loading delivery logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<IconClock className="h-10 w-10 text-gray-400" />}
            headline="No delivery logs found"
            subHeadline="Outbound webhook and third-party deliveries will be recorded here whenever a form submission is processed."
          />
        ) : (
          <div className="space-y-4">
            <div className="text-secondary flex items-center justify-between px-1 text-xs">
              <span>
                Showing last {logs.length} deliveries (Total: {total})
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Success
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  Failed
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Integration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map(log => {
                    const isSuccess = log.status === 'success'
                    return (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {date(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium uppercase text-gray-900 dark:text-gray-100">
                          {log.appId}
                        </td>
                        <td className="px-4 py-3">
                          {isSuccess ? (
                            <Badge color="green" className="gap-1">
                              <IconCheck className="h-3 w-3" />
                              {log.responseStatus ? `${log.responseStatus} OK` : 'Success'}
                            </Badge>
                          ) : (
                            <Badge color="red" className="gap-1">
                              <IconAlertCircle className="h-3 w-3" />
                              {log.responseStatus ? `${log.responseStatus} Failed` : 'Failed'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {log.executionDurationMs ? `${log.executionDurationMs}ms` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{log.attempts || 1}</td>
                        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                          <Button.Ghost
                            size="sm"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                          >
                            {selectedLog?.id === log.id ? 'Hide' : 'Inspect'}
                          </Button.Ghost>
                          {!isSuccess && (
                            <Button
                              size="sm"
                              className="flex-inline items-center gap-1 !px-2 !py-1 text-xs"
                              loading={retryingId === log.id}
                              onClick={() => handleRetry(log)}
                            >
                              <IconRotateClockwise2 className="h-3 w-3" />
                              Replay
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selectedLog && (
              <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                  <span>Diagnostic Payload Details — Log #{selectedLog.id}</span>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
                {selectedLog.endpointUrl && (
                  <div>
                    <span className="text-secondary font-medium">Target URL: </span>
                    <span className="break-all font-mono text-gray-700 dark:text-gray-300">
                      {selectedLog.endpointUrl}
                    </span>
                  </div>
                )}
                {selectedLog.errorMessage && (
                  <div className="rounded bg-red-50 p-2 font-mono text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    <strong>Error: </strong> {selectedLog.errorMessage}
                  </div>
                )}
                {selectedLog.responseBody && (
                  <div>
                    <div className="text-secondary mb-1 font-medium">Response Body:</div>
                    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-gray-900 p-2.5 font-mono text-[11px] text-gray-100">
                      {selectedLog.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
