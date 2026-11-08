import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'

import { IntegrationDeliveryStatusEnum } from '@model'
import {
  AppService,
  FormService,
  IntegrationDeliveryService,
  IntegrationService,
  SubmissionService
} from '@service'
import { mapToObject } from '@utils'

import { BaseQueue } from './base.queue'

export interface IntegrationQueueJob {
  appId: string
  integrationId: string
  formId: string
  submissionId: string
}

@Processor('IntegrationQueue')
export class IntegrationQueue extends BaseQueue {
  constructor(
    private readonly appService: AppService,
    private readonly integrationService: IntegrationService,
    private readonly submissionService: SubmissionService,
    private readonly formService: FormService,
    private readonly deliveryService: IntegrationDeliveryService
  ) {
    super()
  }

  @Process()
  async process(job: Job<IntegrationQueueJob>) {
    const { appId, integrationId, formId, submissionId } = job.data
    const app = this.appService.findById(appId)

    if (app) {
      const [integration, submission, form] = await Promise.all([
        this.integrationService.findById(integrationId),
        this.submissionService.findById(submissionId),
        this.formService.findById(formId)
      ])

      if (integration && submission && form) {
        const config = mapToObject(integration.config)
        const endpointUrl =
          (config as any)?.webhookUrl || (config as any)?.url || (config as any)?.endpoint
        const startTime = Date.now()

        try {
          const runResult = await app.run({
            submission,
            form,
            config
          })

          const durationMs = Date.now() - startTime

          await this.deliveryService.recordAttempt({
            formId,
            integrationId,
            appId,
            submissionId,
            endpointUrl: runResult?.endpointUrl || endpointUrl,
            requestMethod: runResult?.requestMethod || 'POST',
            requestPayload: runResult?.requestPayload
              ? typeof runResult.requestPayload === 'string'
                ? runResult.requestPayload
                : JSON.stringify(runResult.requestPayload, null, 2)
              : undefined,
            responseStatus: runResult?.responseStatus || 200,
            responseBody: runResult?.responseBody
              ? typeof runResult.responseBody === 'string'
                ? runResult.responseBody
                : JSON.stringify(runResult.responseBody, null, 2)
              : undefined,
            executionDurationMs: durationMs,
            attempts: job.attemptsMade + 1,
            status: IntegrationDeliveryStatusEnum.SUCCESS,
            form,
            integration
          })
        } catch (err: any) {
          const durationMs = Date.now() - startTime
          const errorMessage = err?.message || 'Outbound delivery failed'
          const responseStatus =
            err?.response?.statusCode || err?.response?.status || err?.status || 500
          const rawBody = err?.response?.body ?? err?.response?.data
          const responseBody = rawBody
            ? typeof rawBody === 'string'
              ? rawBody
              : JSON.stringify(rawBody, null, 2)
            : undefined

          await this.deliveryService.recordAttempt({
            formId,
            integrationId,
            appId,
            submissionId,
            endpointUrl: err?.diagnosticUrl || endpointUrl,
            requestMethod: err?.diagnosticMethod || 'POST',
            requestPayload: err?.diagnosticPayload
              ? typeof err.diagnosticPayload === 'string'
                ? err.diagnosticPayload
                : JSON.stringify(err.diagnosticPayload, null, 2)
              : undefined,
            responseStatus,
            responseBody,
            executionDurationMs: durationMs,
            errorMessage,
            attempts: job.attemptsMade + 1,
            status: IntegrationDeliveryStatusEnum.FAILED,
            form,
            integration
          })

          // Rethrow to trigger Bull queue retry mechanism if attempts remain
          throw err
        }
      }
    }
  }
}
