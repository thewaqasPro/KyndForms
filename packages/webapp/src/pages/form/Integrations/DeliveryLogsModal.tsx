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
import { cn, useParam } from '@/utils'
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
      isCloseButtonShow={false}
      contentProps={{
        className: 'max-w-5xl !p-0 overflow-hidden',
        forceMount: true
      }}
      onOpenChange={onOpenChange}
    >
      <div className="border-accent-light flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-primary flex items-center gap-2 text-lg font-semibold">
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
          <Button.Link
            size="sm"
            iconOnly
            className="text-secondary hover:text-primary"
            onClick={() => onOpenChange?.(false)}
          >
            <IconX className="h-5 w-5" />
          </Button.Link>
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
            icon={<IconClock className="text-secondary h-10 w-10" />}
            headline="No delivery logs found"
            subHeadline="Outbound webhook and third-party deliveries will be recorded here whenever a form submission is processed."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
              <div className="bg-accent-light text-secondary flex items-center gap-1 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium transition-colors',
                    filter === 'all'
                      ? 'bg-foreground text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  )}
                >
                  All ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('success')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
                    filter === 'success'
                      ? 'bg-foreground text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Success ({successCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('failed')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
                    filter === 'failed'
                      ? 'bg-foreground text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  Failed ({failedCount})
                </button>
              </div>

              <span className="text-secondary">
                Showing {filteredLogs.length} of {total} total
              </span>
            </div>

            <div className="border-accent-light overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="border-accent-light bg-accent-light/50 text-secondary border-b text-xs font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Integration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-accent-light divide-y">
                  {filteredLogs.map(log => {
                    const isSuccess = log.status === 'success'
                    const isSelected = selectedLog?.id === log.id
                    return (
                      <tr
                        key={log.id}
                        className={cn(
                          'transition-colors',
                          isSelected ? 'bg-accent-light/80 font-medium' : 'hover:bg-accent-light/40'
                        )}
                      >
                        <td className="text-secondary whitespace-nowrap px-4 py-3 font-mono text-xs">
                          {date(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </td>
                        <td className="text-primary px-4 py-3 text-xs font-medium uppercase">
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
                        <td className="text-secondary px-4 py-3 font-mono text-xs">
                          {log.executionDurationMs ? `${log.executionDurationMs}ms` : '—'}
                        </td>
                        <td className="text-secondary px-4 py-3 text-xs">{log.attempts || 1}</td>
                        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                          <Button.Ghost
                            size="sm"
                            className="!px-2.5 !py-1 text-xs"
                            onClick={() => setSelectedLog(isSelected ? null : log)}
                          >
                            {isSelected ? 'Close' : 'Inspect'}
                          </Button.Ghost>
                          {!isSuccess && (
                            <Button.Ghost
                              size="sm"
                              className="border-error/30 text-error hover:bg-error/10 flex-inline items-center gap-1 !px-2.5 !py-1 text-xs"
                              loading={retryingId === log.id}
                              onClick={() => handleRetry(log)}
                            >
                              <IconRotateClockwise2 className="h-3 w-3" />
                              Replay
                            </Button.Ghost>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selectedLog && (
              <div className="hf-card border-accent-light mt-4 rounded-xl border p-0 shadow-sm">
                <div className="border-accent-light flex flex-wrap items-center justify-between border-b p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-primary font-semibold">
                      Diagnostic Payload Details — Log #{selectedLog.id}
                    </span>
                    <Badge color={selectedLog.status === 'success' ? 'green' : 'red'}>
                      {selectedLog.status === 'success' ? 'Delivered' : 'Failed'}
                    </Badge>
                    {selectedLog.requestMethod && (
                      <span className="border-accent-light text-secondary bg-accent-light/60 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                        {selectedLog.requestMethod}
                      </span>
                    )}
                    {selectedLog.executionDurationMs && (
                      <span className="text-secondary font-mono text-xs">
                        ({selectedLog.executionDurationMs}ms)
                      </span>
                    )}
                  </div>
                  <Button.Link
                    size="sm"
                    iconOnly
                    onClick={() => setSelectedLog(null)}
                    className="text-secondary hover:text-primary"
                  >
                    <IconX className="h-4 w-4" />
                  </Button.Link>
                </div>

                <div className="border-accent-light flex border-b px-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className={cn(
                      'border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                      activeTab === 'request'
                        ? 'border-primary text-primary'
                        : 'text-secondary hover:text-primary border-transparent'
                    )}
                  >
                    Request Payload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('response')}
                    className={cn(
                      'border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                      activeTab === 'response'
                        ? 'border-primary text-primary'
                        : 'text-secondary hover:text-primary border-transparent'
                    )}
                  >
                    Response Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      'border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                      activeTab === 'details'
                        ? 'border-primary text-primary'
                        : 'text-secondary hover:text-primary border-transparent'
                    )}
                  >
                    Headers & Endpoint
                  </button>
                </div>

                <div className="p-4">
                  {activeTab === 'request' && (
                    <div className="space-y-2">
                      <div className="text-secondary flex items-center justify-between text-xs">
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
                        <pre className="border-accent-light text-primary bg-accent-light/40 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[11px] leading-relaxed">
                          {tryFormatJson(selectedLog.requestPayload)}
                        </pre>
                      ) : (
                        <div className="border-accent-light text-secondary rounded-lg border border-dashed p-6 text-center text-xs">
                          No outbound request payload was recorded for this delivery attempt.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'response' && (
                    <div className="space-y-3">
                      {selectedLog.errorMessage && (
                        <div className="border-error/20 bg-error/10 text-error rounded-lg border p-3 font-mono text-xs">
                          <strong>Error:</strong> {selectedLog.errorMessage}
                        </div>
                      )}
                      <div className="text-secondary flex items-center justify-between text-xs">
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
                        <pre className="border-accent-light text-primary bg-accent-light/40 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[11px] leading-relaxed">
                          {tryFormatJson(selectedLog.responseBody)}
                        </pre>
                      ) : (
                        <div className="border-accent-light text-secondary rounded-lg border border-dashed p-6 text-center text-xs">
                          No response body returned from destination server.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                      <div className="border-accent-light bg-accent-light/20 space-y-1 rounded-lg border p-3">
                        <span className="text-secondary font-medium">Target Endpoint:</span>
                        <div className="text-primary break-all font-mono">
                          {selectedLog.endpointUrl || 'N/A'}
                        </div>
                      </div>
                      <div className="border-accent-light bg-accent-light/20 space-y-1 rounded-lg border p-3">
                        <span className="text-secondary font-medium">Submission ID:</span>
                        <div className="text-primary break-all font-mono">
                          {selectedLog.submissionId}
                        </div>
                      </div>
                      <div className="border-accent-light bg-accent-light/20 space-y-1 rounded-lg border p-3">
                        <span className="text-secondary font-medium">Execution Duration:</span>
                        <div className="text-primary font-mono">
                          {selectedLog.executionDurationMs || 0} ms
                        </div>
                      </div>
                      <div className="border-accent-light bg-accent-light/20 space-y-1 rounded-lg border p-3">
                        <span className="text-secondary font-medium">Attempt Number:</span>
                        <div className="text-primary font-mono">{selectedLog.attempts || 1}</div>
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
