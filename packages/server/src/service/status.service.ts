import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Queue } from 'bull'
import { Connection } from 'mongoose'

import { IntegrationDeliveryService } from './integration-delivery.service'
import { RedisService } from './redis.service'
import { S3_BUCKET, S3_ENDPOINT, SMTP_HOST, SMTP_PORT } from '@environments'

export interface SubsystemStatus {
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  message?: string
  details?: Record<string, any>
}

export interface SystemStatusReport {
  status: 'operational' | 'degraded' | 'down'
  timestamp: string
  uptimeSeconds: number
  services: {
    database: SubsystemStatus
    redis: SubsystemStatus
    queues: SubsystemStatus
    mailer: SubsystemStatus
    storage: SubsystemStatus
  }
  integrations24h: {
    totalDelivered: number
    totalFailed: number
    successRate: number
    avgLatencyMs: number
  }
}

@Injectable()
export class StatusService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
    private readonly integrationDeliveryService: IntegrationDeliveryService,
    @InjectQueue('IntegrationQueue') private readonly integrationQueue: Queue,
    @InjectQueue('SubmissionNotificationQueue') private readonly submissionNotificationQueue: Queue,
    @InjectQueue('FormReportQueue') private readonly formReportQueue: Queue,
    @InjectQueue('MailQueue') private readonly mailQueue: Queue
  ) {}

  async getStatusReport(): Promise<SystemStatusReport> {
    const [database, redis, queues, mailer, storage, integrations24h] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueues(),
      this.checkMailer(),
      this.checkStorage(),
      this.integrationDeliveryService.get24HourTelemetry()
    ])

    let overallStatus: 'operational' | 'degraded' | 'down' = 'operational'

    if (database.status === 'down' || redis.status === 'down') {
      overallStatus = 'down'
    } else if (
      database.status === 'degraded' ||
      redis.status === 'degraded' ||
      queues.status === 'degraded' ||
      integrations24h.successRate < 95
    ) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database,
        redis,
        queues,
        mailer,
        storage
      },
      integrations24h
    }
  }

  private async checkDatabase(): Promise<SubsystemStatus> {
    const start = Date.now()
    try {
      if (this.mongoConnection.readyState !== 1) {
        return { status: 'down', message: 'MongoDB disconnected' }
      }
      await this.mongoConnection.db?.admin().ping()
      const latencyMs = Date.now() - start
      return {
        status: latencyMs > 500 ? 'degraded' : 'up',
        latencyMs,
        details: { databaseName: this.mongoConnection.name }
      }
    } catch (err: any) {
      return { status: 'down', message: err.message }
    }
  }

  private async checkRedis(): Promise<SubsystemStatus> {
    const start = Date.now()
    try {
      const pong = await this.redisService.ping()
      const latencyMs = Date.now() - start
      if (pong === 'PONG') {
        return {
          status: latencyMs > 200 ? 'degraded' : 'up',
          latencyMs
        }
      }
      return { status: 'down', message: 'Unexpected ping response' }
    } catch (err: any) {
      return { status: 'down', message: err.message }
    }
  }

  private async checkQueues(): Promise<SubsystemStatus> {
    try {
      const [integrationCounts, notificationCounts, reportCounts, mailCounts] = await Promise.all([
        this.integrationQueue.getJobCounts(),
        this.submissionNotificationQueue.getJobCounts(),
        this.formReportQueue.getJobCounts(),
        this.mailQueue.getJobCounts()
      ])

      const totalFailed =
        (integrationCounts.failed || 0) +
        (notificationCounts.failed || 0) +
        (reportCounts.failed || 0) +
        (mailCounts.failed || 0)

      const totalActive =
        (integrationCounts.active || 0) +
        (notificationCounts.active || 0) +
        (reportCounts.active || 0) +
        (mailCounts.active || 0)

      const totalWaiting =
        (integrationCounts.waiting || 0) +
        (notificationCounts.waiting || 0) +
        (reportCounts.waiting || 0) +
        (mailCounts.waiting || 0)

      return {
        status: totalFailed > 50 ? 'degraded' : 'up',
        details: {
          activeJobs: totalActive,
          waitingJobs: totalWaiting,
          failedJobs: totalFailed,
          queues: {
            integration: integrationCounts,
            submissionNotification: notificationCounts,
            formReport: reportCounts,
            mail: mailCounts
          }
        }
      }
    } catch (err: any) {
      return { status: 'down', message: err.message }
    }
  }

  private checkMailer(): SubsystemStatus {
    const configured = !!SMTP_HOST
    return {
      status: configured ? 'up' : 'degraded',
      message: configured ? 'SMTP transport configured' : 'SMTP not configured',
      details: {
        host: SMTP_HOST ? String(SMTP_HOST).split('.').slice(-2).join('.') : undefined,
        port: SMTP_PORT || 587
      }
    }
  }

  private checkStorage(): SubsystemStatus {
    const isS3Configured = !!S3_BUCKET
    return {
      status: 'up',
      details: {
        storageType: isS3Configured ? 's3-compatible' : 'local-filesystem',
        endpoint: S3_ENDPOINT || 'local',
        bucket: S3_BUCKET || 'local-uploads'
      }
    }
  }
}
