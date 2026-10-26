import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { MailService } from './mail.service'
import { APP_HOMEPAGE_URL } from '@environments'
import {
  FormModel,
  IntegrationDeliveryLogModel,
  IntegrationDeliveryStatusEnum,
  IntegrationModel,
  IntegrationStatusEnum,
  TeamMemberModel,
  TeamRoleEnum,
  UserModel
} from '@model'
import { Logger } from '@utils'

export interface RecordAttemptOptions {
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
  status: IntegrationDeliveryStatusEnum
  form?: FormModel | null
  integration?: IntegrationModel | null
}

const ALERT_THROTTLE_HOURS = 6

@Injectable()
export class IntegrationDeliveryService {
  private readonly logger = new Logger(IntegrationDeliveryService.name)

  constructor(
    @InjectModel(IntegrationDeliveryLogModel.name)
    private readonly logModel: Model<IntegrationDeliveryLogModel>,
    @InjectModel(IntegrationModel.name)
    private readonly integrationModel: Model<IntegrationModel>,
    @InjectModel(TeamMemberModel.name)
    private readonly teamMemberModel: Model<TeamMemberModel>,
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserModel>,
    private readonly mailService: MailService
  ) {}

  async recordAttempt(options: RecordAttemptOptions): Promise<IntegrationDeliveryLogModel> {
    const {
      formId,
      integrationId,
      appId,
      submissionId,
      endpointUrl,
      responseStatus,
      responseBody,
      executionDurationMs = 0,
      errorMessage,
      attempts = 1,
      status,
      form,
      integration
    } = options

    let isAlertSent = false

    if (status === IntegrationDeliveryStatusEnum.SUCCESS) {
      await this.integrationModel.updateOne(
        { _id: integrationId },
        {
          $set: {
            consecutiveFailures: 0,
            status: IntegrationStatusEnum.ACTIVE
          }
        }
      )
    } else {
      const updated = await this.integrationModel.findByIdAndUpdate(
        integrationId,
        {
          $inc: { consecutiveFailures: 1 },
          $set: {
            lastFailureAt: new Date(),
            lastErrorMessage: errorMessage
          }
        },
        { new: true }
      )

      const consecutive = updated?.consecutiveFailures ?? attempts
      if (consecutive >= 3) {
        await this.integrationModel.updateOne(
          { _id: integrationId },
          { $set: { status: IntegrationStatusEnum.BROKEN } }
        )

        const lastAlert = updated?.lastAlertSentAt
        const now = new Date()
        const shouldAlert =
          !lastAlert ||
          now.getTime() - new Date(lastAlert).getTime() > ALERT_THROTTLE_HOURS * 60 * 60 * 1000

        if (shouldAlert && form) {
          isAlertSent = await this.dispatchAlert({
            form,
            integration: updated || integration,
            appId,
            endpointUrl: endpointUrl || 'N/A',
            errorMessage: errorMessage || 'Unknown delivery error'
          })

          if (isAlertSent) {
            await this.integrationModel.updateOne(
              { _id: integrationId },
              { $set: { lastAlertSentAt: now } }
            )
          }
        }
      }
    }

    return this.logModel.create({
      formId,
      integrationId,
      appId,
      submissionId,
      endpointUrl,
      responseStatus,
      responseBody: responseBody ? String(responseBody).slice(0, 4000) : undefined,
      executionDurationMs,
      errorMessage,
      attempts,
      status,
      isAlertSent
    })
  }

  private async dispatchAlert(params: {
    form: FormModel
    integration?: IntegrationModel | null
    appId: string
    endpointUrl: string
    errorMessage: string
  }): Promise<boolean> {
    try {
      const { form, appId, endpointUrl, errorMessage } = params

      // Find workspace owners/admins to alert
      const members = await this.teamMemberModel.find({
        teamId: form.teamId,
        role: { $in: [TeamRoleEnum.OWNER, TeamRoleEnum.ADMIN] }
      })

      const userIds = members.map(m => m.memberId)
      if (userIds.length === 0) {
        return false
      }

      const users = await this.userModel.find({ _id: { $in: userIds } })
      if (users.length === 0) {
        return false
      }

      const link = `${APP_HOMEPAGE_URL}/form/${form.id}/settings/integrations`
      const appName = appId.charAt(0).toUpperCase() + appId.slice(1)

      for (const user of users) {
        if (user.email) {
          await this.mailService.integrationBrokenAlert(
            user.email,
            {
              appName,
              formName: form.name || 'Untitled Form',
              endpointUrl,
              errorMessage,
              link
            },
            user.lang
          )
        }
      }

      return true
    } catch (err: any) {
      this.logger.error(`Failed to dispatch integration broken alert: ${err.message}`)
      return false
    }
  }

  async getLogs(formId: string, integrationId?: string, limit = 50, skip = 0) {
    const query: Record<string, any> = { formId }
    if (integrationId) {
      query.integrationId = integrationId
    }

    const [logs, total] = await Promise.all([
      this.logModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 100))
        .lean(),
      this.logModel.countDocuments(query)
    ])

    return { logs, total }
  }

  async getLogById(id: string): Promise<IntegrationDeliveryLogModel | null> {
    return this.logModel.findById(id)
  }

  async get24HourTelemetry(): Promise<{
    totalDelivered: number
    totalFailed: number
    successRate: number
    avgLatencyMs: number
  }> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [totalDelivered, totalFailed, latencyAgg] = await Promise.all([
      this.logModel.countDocuments({
        createdAt: { $gte: dayAgo },
        status: IntegrationDeliveryStatusEnum.SUCCESS
      }),
      this.logModel.countDocuments({
        createdAt: { $gte: dayAgo },
        status: IntegrationDeliveryStatusEnum.FAILED
      }),
      this.logModel.aggregate([
        { $match: { createdAt: { $gte: dayAgo } } },
        { $group: { _id: null, avgMs: { $avg: '$executionDurationMs' } } }
      ])
    ])

    const total = totalDelivered + totalFailed
    const successRate = total > 0 ? Number(((totalDelivered / total) * 100).toFixed(2)) : 100
    const avgLatencyMs = Math.round(latencyAgg[0]?.avgMs || 0)

    return {
      totalDelivered,
      totalFailed,
      successRate,
      avgLatencyMs
    }
  }
}
