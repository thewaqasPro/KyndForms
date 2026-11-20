import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconCopy,
  IconRefresh,
  IconRotateClockwise2,
  IconX
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { IntegrationService } from '@/services'
import { cn, useParam } from '@/utils'
import { dayjs } from '@/utils/date'
import { date } from '@kyndform/utils'

import { Badge, Button, EmptyState, Loader, Tooltip } from '@/components'
import { useFormStore } from '@/store'

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

export default function FormLogs() {
  const { formId } = useParam()
  const { form } = useFormStore()
  const targetFormId = formId || (form as any)?.id || (form as any)?._id

  const [loading, setLoading] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DeliveryLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<DeliveryLogItem | null>(null)
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'details'>('request')
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function fetchLogs() {
    const id = targetFormId
    if (!id) return
    setLoading(true)
    try {
      const res = await IntegrationService.getLogs(id, undefined, 50, 0)
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
    fetchLogs()
    setSelectedLog(null)
    setFilter('all')
    setActiveTab('request')
  }, [targetFormId])

  async function handleRetry(log: DeliveryLogItem) {
    const id = targetFormId
    if (!id || retryingId) return
    setRetryingId(log.id)
    try {
      const res = await IntegrationService.retryDelivery(id, log.id)
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

  const resolvedSubmissions = useMemo(() => {
    const map = new Map<string, { resolvedAt: string; attempt: number }>()
    for (const log of logs) {
      if (log.status === 'success') {
        const key = `${log.submissionId}:${log.appId}`
        if (!map.has(key)) {
          map.set(key, { resolvedAt: log.createdAt, attempt: log.attempts })
        }
      }
    }
    return map
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (filter === 'success') return logs.filter(l => l.status === 'success')
    if (filter === 'failed') return logs.filter(l => l.status !== 'success')
    return logs
  }, [logs, filter])

  return (
    <div className="mt-8 space-y-6 px-6">
      <div className="border-accent-light flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-primary text-xl font-semibold">Delivery & Integration Logs</h1>
          <p className="text-secondary mt-1 text-xs">
            Inspect real-time outbound delivery payloads, HTTP responses, status codes, and retry
            failed submissions.
          </p>
        </div>
        <Button.Ghost
          size="sm"
          loading={loading}
          onClick={fetchLogs}
          className="flex items-center gap-1.5"
        >
          <IconRefresh className="h-4 w-4" />
          Refresh Logs
        </Button.Ghost>
      </div>

      <div className="space-y-4">
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
                    const isRetrying = retryingId === log.id
                    const isSelected = selectedLog?.id === log.id

                    const submissionKey = `${log.submissionId}:${log.appId}`
                    const resolution = resolvedSubmissions.get(submissionKey)
                    const isResolvedByLaterAttempt =
                      !isSuccess &&
                      resolution &&
                      new Date(resolution.resolvedAt).getTime() > new Date(log.createdAt).getTime()

                    return (
                      <tr
                        key={log.id}
                        className={cn(
                          'hover:bg-accent-light/40 transition-colors',
                          isSelected && 'bg-accent-light/60'
                        )}
                      >
                        <td className="text-secondary whitespace-nowrap px-4 py-3 text-xs">
                          <Tooltip
                            label={
                              log.createdAt
                                ? date(log.createdAt).format('YYYY-MM-DD HH:mm:ss')
                                : '-'
                            }
                          >
                            <span className="cursor-help">
                              {log.createdAt ? dayjs(log.createdAt).fromNow() : '-'}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-accent-light text-primary inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase">
                            {log.appId || 'webhook'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <IconCheck className="h-3 w-3" />
                              Delivered {log.responseStatus ? `(${log.responseStatus})` : ''}
                            </span>
                          ) : isResolvedByLaterAttempt ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 opacity-60 dark:bg-rose-950/50 dark:text-rose-400">
                                <IconAlertCircle className="h-3 w-3" />
                                Failed {log.responseStatus ? `(${log.responseStatus})` : ''}
                              </span>
                              <span className="text-secondary text-[10px]">
                                Resolved on attempt #{resolution.attempt}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                              <IconAlertCircle className="h-3 w-3" />
                              Failed {log.responseStatus ? `(${log.responseStatus})` : ''}
                            </span>
                          )}
                        </td>
                        <td className="text-secondary whitespace-nowrap px-4 py-3 text-xs">
                          {log.executionDurationMs != null ? `${log.executionDurationMs}ms` : '-'}
                        </td>
                        <td className="text-secondary whitespace-nowrap px-4 py-3 text-xs">
                          {log.attempts || 1} / 3
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button.Ghost
                              size="sm"
                              className="!px-2.5 !py-1 text-xs"
                              onClick={() => {
                                setSelectedLog(isSelected ? null : log)
                                setActiveTab(isSuccess ? 'response' : 'details')
                              }}
                            >
                              {isSelected ? 'Close' : 'Details'}
                            </Button.Ghost>
                            {!isSuccess && !isResolvedByLaterAttempt && (
                              <Button.Ghost
                                size="sm"
                                loading={isRetrying}
                                onClick={() => handleRetry(log)}
                                className="text-primary hover:text-primary flex items-center gap-1 !px-2 !py-1 text-xs"
                              >
                                <IconRotateClockwise2 className="h-3.5 w-3.5" />
                                Replay
                              </Button.Ghost>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Diagnostic Drawer for Selected Log */}
      {selectedLog && (
        <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
          <div className="border-accent-light bg-foreground relative w-screen max-w-xl border-l shadow-2xl">
            <div className="border-accent-light flex items-center justify-between border-b px-6 py-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-primary text-base font-semibold">
                    Diagnostic Payload Details
                  </h3>
                  <Badge color={selectedLog.status === 'success' ? 'green' : 'red'}>
                    {selectedLog.status === 'success' ? 'Delivered' : 'Failed'}
                  </Badge>
                </div>
                <p className="text-secondary text-xs">
                  Log #{selectedLog.id} &bull; {selectedLog.requestMethod || 'POST'} &bull;{' '}
                  {selectedLog.executionDurationMs != null
                    ? `${selectedLog.executionDurationMs}ms`
                    : ''}
                </p>
              </div>
              <Button.Link size="sm" iconOnly onClick={() => setSelectedLog(null)}>
                <IconX className="h-5 w-5" />
              </Button.Link>
            </div>

            <div className="border-accent-light flex border-b px-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className={cn(
                  'border-b-2 px-3 py-2.5 transition-colors',
                  activeTab === 'request'
                    ? 'border-primary text-primary'
                    : 'text-secondary hover:text-primary border-transparent'
                )}
              >
                Outgoing Payload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('response')}
                className={cn(
                  'border-b-2 px-3 py-2.5 transition-colors',
                  activeTab === 'response'
                    ? 'border-primary text-primary'
                    : 'text-secondary hover:text-primary border-transparent'
                )}
              >
                Response Body
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'border-b-2 px-3 py-2.5 transition-colors',
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'text-secondary hover:text-primary border-transparent'
                )}
              >
                Failure & Info
              </button>
            </div>

            <div className="h-[calc(100vh-130px)] space-y-4 overflow-y-auto p-6">
              {activeTab === 'request' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-xs font-semibold uppercase">
                      Request JSON ({selectedLog.endpointUrl || 'Target Endpoint'})
                    </span>
                    <Button.Ghost
                      size="sm"
                      onClick={() => copyToClipboard(selectedLog.requestPayload || '', 'req')}
                      className="flex items-center gap-1 !px-2 !py-1 text-xs"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                      {copiedKey === 'req' ? 'Copied!' : 'Copy Payload'}
                    </Button.Ghost>
                  </div>
                  <pre className="bg-accent-light/50 text-primary overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
                    {tryFormatJson(selectedLog.requestPayload) || '// No payload recorded'}
                  </pre>
                </div>
              )}

              {activeTab === 'response' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-xs font-semibold uppercase">
                      Response Body (Status {selectedLog.responseStatus || 'N/A'})
                    </span>
                    <Button.Ghost
                      size="sm"
                      onClick={() => copyToClipboard(selectedLog.responseBody || '', 'res')}
                      className="flex items-center gap-1 !px-2 !py-1 text-xs"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                      {copiedKey === 'res' ? 'Copied!' : 'Copy Response'}
                    </Button.Ghost>
                  </div>
                  <pre className="bg-accent-light/50 text-primary overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
                    {tryFormatJson(selectedLog.responseBody) || '// No response body recorded'}
                  </pre>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-4 text-xs">
                  {selectedLog.errorMessage && (
                    <div className="space-y-1">
                      <span className="text-secondary font-semibold uppercase">Error Message</span>
                      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 font-mono text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        {selectedLog.errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-secondary font-semibold uppercase">Target URL</span>
                    <div className="bg-accent-light/50 text-primary break-all rounded-lg p-2.5 font-mono">
                      {selectedLog.endpointUrl || '-'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-secondary font-semibold uppercase">Timestamp</span>
                      <div className="bg-accent-light/50 text-primary rounded-lg p-2.5">
                        {selectedLog.createdAt
                          ? date(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-secondary font-semibold uppercase">Submission ID</span>
                      <div className="bg-accent-light/50 text-primary truncate rounded-lg p-2.5 font-mono">
                        {selectedLog.submissionId || '-'}
                      </div>
                    </div>
                  </div>

                  {selectedLog.status !== 'success' && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        loading={retryingId === selectedLog.id}
                        onClick={() => handleRetry(selectedLog)}
                        className="flex w-full items-center justify-center gap-1.5"
                      >
                        <IconRotateClockwise2 className="h-4 w-4" />
                        Replay Delivery Now
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
