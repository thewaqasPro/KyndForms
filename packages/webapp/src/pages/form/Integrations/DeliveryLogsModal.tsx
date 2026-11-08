import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconCopy,
  IconFileText,
  IconRefresh,
  IconRotateClockwise2,
  IconX
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

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
  requestMethod?: string
  requestPayload?: string
  responseStatus?: number
  responseBody?: string
  executionDurationMs?: number
  errorMessage?: string
  attempts: number
  status: string
  isAlertSent: boolean
  createdAt: string
}

function tryFormatJson(val?: string): string {
  if (!val) return ''
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(val)
  }
}

export default function DeliveryLogsModal() {
  const { formId } = useParam()
  const { isOpen, payload, onOpenChange } = useModal('DeliveryLogsModal')

  const [loading, setLoading] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DeliveryLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<DeliveryLogItem | null>(null)
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'details'>('request')
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
      setFilter('all')
      setActiveTab('request')
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

  function copyToClipboard(text: string, key: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  const successCount = useMemo(() => logs.filter(l => l.status === 'success').length, [logs])
  const failedCount = useMemo(() => logs.filter(l => l.status !== 'success').length, [logs])

  const filteredLogs = useMemo(() => {
    if (filter === 'success') return logs.filter(l => l.status === 'success')
    if (filter === 'failed') return logs.filter(l => l.status !== 'success')
    return logs
  }, [logs, filter])

  return (
    <Modal
      open={isOpen}
      contentProps={{
        className: 'max-w-5xl p-0 overflow-hidden',
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
            Real-time delivery attempts, payloads, responses, and retry capabilities.
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-1 dark:border-gray-800 dark:bg-gray-800/40">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('success')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    filter === 'success'
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-700 dark:text-emerald-400'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Success ({successCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('failed')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    filter === 'failed'
                      ? 'bg-white text-rose-600 shadow-sm dark:bg-gray-700 dark:text-rose-400'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  Failed ({failedCount})
                </button>
              </div>

              <span className="text-secondary">
                Showing {filteredLogs.length} of {total} total
              </span>
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
                  {filteredLogs.map(log => {
                    const isSuccess = log.status === 'success'
                    const isSelected = selectedLog?.id === log.id
                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/30'
                        }`}
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
                            className="!px-2.5 !py-1 text-xs"
                            onClick={() => setSelectedLog(isSelected ? null : log)}
                          >
                            {isSelected ? 'Close' : 'Inspect'}
                          </Button.Ghost>
                          {!isSuccess && (
                            <Button
                              size="sm"
                              className="flex-inline items-center gap-1 !px-2.5 !py-1 text-xs"
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
              <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Diagnostics — Log #{selectedLog.id}
                    </span>
                    <Badge color={selectedLog.status === 'success' ? 'green' : 'red'}>
                      {selectedLog.status === 'success' ? 'Delivered' : 'Failed'}
                    </Badge>
                    {selectedLog.requestMethod && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {selectedLog.requestMethod}
                      </span>
                    )}
                    {selectedLog.executionDurationMs && (
                      <span className="text-secondary text-xs">
                        ({selectedLog.executionDurationMs}ms)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex border-b border-gray-100 px-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === 'request'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Request Payload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('response')}
                    className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === 'response'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Response Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === 'details'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Headers & Endpoint
                  </button>
                </div>

                <div className="p-4">
                  {activeTab === 'request' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Outbound payload dispatched to {selectedLog.appId}:</span>
                        {selectedLog.requestPayload && (
                          <Button.Ghost
                            size="sm"
                            className="!px-2 !py-0.5 text-xs"
                            onClick={() =>
                              copyToClipboard(
                                tryFormatJson(selectedLog.requestPayload),
                                'requestPayload'
                              )
                            }
                          >
                            {copiedKey === 'requestPayload' ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <IconCheck className="h-3 w-3" /> Copied
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <IconCopy className="h-3 w-3" /> Copy JSON
                              </span>
                            )}
                          </Button.Ghost>
                        )}
                      </div>
                      {selectedLog.requestPayload ? (
                        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-100">
                          {tryFormatJson(selectedLog.requestPayload)}
                        </pre>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 dark:border-gray-800">
                          No outbound request payload was recorded for this delivery attempt.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'response' && (
                    <div className="space-y-3">
                      {selectedLog.errorMessage && (
                        <div className="rounded-lg bg-rose-50 p-3 font-mono text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <strong>Error:</strong> {selectedLog.errorMessage}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>HTTP {selectedLog.responseStatus || '—'} Response Body:</span>
                        {selectedLog.responseBody && (
                          <Button.Ghost
                            size="sm"
                            className="!px-2 !py-0.5 text-xs"
                            onClick={() =>
                              copyToClipboard(
                                tryFormatJson(selectedLog.responseBody),
                                'responseBody'
                              )
                            }
                          >
                            {copiedKey === 'responseBody' ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <IconCheck className="h-3 w-3" /> Copied
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <IconCopy className="h-3 w-3" /> Copy JSON
                              </span>
                            )}
                          </Button.Ghost>
                        )}
                      </div>
                      {selectedLog.responseBody ? (
                        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-100">
                          {tryFormatJson(selectedLog.responseBody)}
                        </pre>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 dark:border-gray-800">
                          No response body returned from destination server.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                      <div className="space-y-1 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <span className="text-secondary font-medium">Target Endpoint:</span>
                        <div className="break-all font-mono text-gray-800 dark:text-gray-200">
                          {selectedLog.endpointUrl || 'N/A'}
                        </div>
                      </div>
                      <div className="space-y-1 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <span className="text-secondary font-medium">Submission ID:</span>
                        <div className="break-all font-mono text-gray-800 dark:text-gray-200">
                          {selectedLog.submissionId}
                        </div>
                      </div>
                      <div className="space-y-1 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <span className="text-secondary font-medium">Execution Duration:</span>
                        <div className="font-mono text-gray-800 dark:text-gray-200">
                          {selectedLog.executionDurationMs || 0} ms
                        </div>
                      </div>
                      <div className="space-y-1 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <span className="text-secondary font-medium">Attempt Number:</span>
                        <div className="font-mono text-gray-800 dark:text-gray-200">
                          {selectedLog.attempts || 1}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
