import {
  IconActivity,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDatabase,
  IconMail,
  IconRefresh,
  IconServer,
  IconWorldUpload
} from '@tabler/icons-react'
import { FC, useEffect, useState } from 'react'

import { AdminService, SubsystemStatus, SystemStatusReport } from '@/services/admin'

import { Badge, Button, Loader } from '@/components'

import { AdminLayout } from './AdminLayout'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${seconds % 60}s`
}

export const SystemStatus: FC = () => {
  const [report, setReport] = useState<SystemStatusReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const data = await AdminService.getSystemStatus()
      setReport(data)
    } catch (err: any) {
      setError(err.message || 'Failed to query system status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const renderBadge = (status: SubsystemStatus['status']) => {
    switch (status) {
      case 'up':
        return (
          <Badge color="green" className="gap-1">
            <IconCheck className="h-3 w-3" />
            Operational
          </Badge>
        )
      case 'degraded':
        return (
          <Badge color="amber" className="gap-1">
            <IconAlertTriangle className="h-3 w-3" />
            Degraded
          </Badge>
        )
      case 'down':
      default:
        return (
          <Badge color="red" className="gap-1">
            <IconAlertCircle className="h-3 w-3" />
            Down
          </Badge>
        )
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="border-accent-light flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="hf-page-title flex items-center gap-2.5">
              <IconActivity className="text-primary h-7 w-7" />
              System Status &amp; Diagnostics
            </h1>
            <p className="text-secondary mt-1 text-sm">
              Real-time multi-subsystem telemetry, background queue throughput, and outbound
              integration health.
            </p>
          </div>
          <Button
            size="sm"
            loading={loading}
            onClick={fetchStatus}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <IconRefresh className="h-4 w-4" />
            Run Diagnostics
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <IconAlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !report ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="text-primary h-10 w-10" />
            <p className="text-secondary mt-4 text-sm">
              Running real-time subsystem diagnostics...
            </p>
          </div>
        ) : report ? (
          <>
            {/* System Overview Banner */}
            <div
              className={`rounded-xl border p-6 transition-all ${
                report.status === 'operational'
                  ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20'
                  : report.status === 'degraded'
                    ? 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20'
                    : 'border-red-500/30 bg-red-500/10 dark:bg-red-950/20'
              }`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
                      report.status === 'operational'
                        ? 'bg-emerald-600'
                        : report.status === 'degraded'
                          ? 'bg-amber-600'
                          : 'bg-red-600'
                    }`}
                  >
                    {report.status === 'operational' ? (
                      <IconCheck className="h-7 w-7" />
                    ) : (
                      <IconAlertTriangle className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-primary text-xl font-bold capitalize">
                      {report.status === 'operational'
                        ? 'All Systems Operational'
                        : report.status === 'degraded'
                          ? 'Subsystems Degraded'
                          : 'Service Outage Detected'}
                    </h2>
                    <p className="text-secondary mt-0.5 text-xs">
                      {report.status === 'operational'
                        ? 'MongoDB, Redis broker, background queues, and mailer are operating within normal parameters.'
                        : 'One or more background queues or database links are reporting latency or failures.'}
                    </p>
                  </div>
                </div>

                <div className="border-accent-light text-secondary flex items-center gap-6 border-t pt-3 text-xs md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <div>
                    <div className="hf-label-muted">Uptime</div>
                    <div className="text-primary mt-0.5 text-sm font-semibold">
                      {formatUptime(report.uptimeSeconds)}
                    </div>
                  </div>
                  <div>
                    <div className="hf-label-muted">Last Check</div>
                    <div className="text-primary mt-0.5 text-sm font-semibold">
                      {new Date(report.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subsystems Telemetry Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* MongoDB */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <IconDatabase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">MongoDB Database</h3>
                      <p className="text-secondary text-[11px]">Primary Document Store</p>
                    </div>
                  </div>
                  {renderBadge(report.services.database.status)}
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Round-trip latency:</span>
                    <span className="text-primary font-mono font-medium">
                      {report.services.database.latencyMs !== undefined
                        ? `${report.services.database.latencyMs}ms`
                        : '—'}
                    </span>
                  </div>
                  {report.services.database.details?.databaseName && (
                    <div className="flex justify-between">
                      <span>Database:</span>
                      <span className="text-primary font-mono">
                        {report.services.database.details.databaseName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Redis Broker */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <IconServer className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">Redis Memory Broker</h3>
                      <p className="text-secondary text-[11px]">Queue &amp; Ephemeral Cache</p>
                    </div>
                  </div>
                  {renderBadge(report.services.redis.status)}
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Ping latency:</span>
                    <span className="text-primary font-mono font-medium">
                      {report.services.redis.latencyMs !== undefined
                        ? `${report.services.redis.latencyMs}ms`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heartbeat:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      PONG received
                    </span>
                  </div>
                </div>
              </div>

              {/* Bull Queue Workers */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <IconClock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">Bull Queue Workers</h3>
                      <p className="text-secondary text-[11px]">Async Job Pipelines</p>
                    </div>
                  </div>
                  {renderBadge(report.services.queues.status)}
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Active jobs:</span>
                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                      {report.services.queues.details?.activeJobs ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waiting jobs:</span>
                    <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                      {report.services.queues.details?.waitingJobs ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed jobs:</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      {report.services.queues.details?.failedJobs ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* SMTP Mailer */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <IconMail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">SMTP Mailer</h3>
                      <p className="text-secondary text-[11px]">Transactional Email Transport</p>
                    </div>
                  </div>
                  {renderBadge(report.services.mailer.status)}
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-primary font-medium">
                      {report.services.mailer.message || 'Configured'}
                    </span>
                  </div>
                  {report.services.mailer.details?.port && (
                    <div className="flex justify-between">
                      <span>Port:</span>
                      <span className="text-primary font-mono">
                        {report.services.mailer.details.port}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Storage */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <IconWorldUpload className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">Object Storage</h3>
                      <p className="text-secondary text-[11px]">Media &amp; Uploads Store</p>
                    </div>
                  </div>
                  {renderBadge(report.services.storage.status)}
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Engine:</span>
                    <span className="text-primary font-medium capitalize">
                      {report.services.storage.details?.storageType || 'local-filesystem'}
                    </span>
                  </div>
                  {report.services.storage.details?.bucket && (
                    <div className="flex justify-between">
                      <span>Bucket / Folder:</span>
                      <span className="text-primary font-mono">
                        {report.services.storage.details.bucket}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 24-Hour Outbound Integration Telemetry */}
              <div className="hf-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <IconActivity className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-primary text-sm font-semibold">
                        24h Integrations Health
                      </h3>
                      <p className="text-secondary text-[11px]">Webhook &amp; App Telemetry</p>
                    </div>
                  </div>
                  <Badge
                    color={
                      report.integrations24h.successRate >= 99
                        ? 'green'
                        : report.integrations24h.successRate >= 90
                          ? 'amber'
                          : 'red'
                    }
                  >
                    {report.integrations24h.successRate}% Success
                  </Badge>
                </div>
                <div className="border-accent-light text-secondary space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span>Successful deliveries:</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {report.integrations24h.totalDelivered}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed attempts:</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      {report.integrations24h.totalFailed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average latency:</span>
                    <span className="text-primary font-mono font-medium">
                      {report.integrations24h.avgLatencyMs}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}

export default SystemStatus
