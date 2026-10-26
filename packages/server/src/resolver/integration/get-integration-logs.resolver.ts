import { Auth, FormGuard } from '@decorator'
import { GetIntegrationLogsInput, IntegrationLogsResultType } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { IntegrationDeliveryService } from '@service'

@Resolver()
@Auth()
export class GetIntegrationLogsResolver {
  constructor(private readonly integrationDeliveryService: IntegrationDeliveryService) {}

  @Query(returns => IntegrationLogsResultType)
  @FormGuard()
  async getIntegrationLogs(
    @Args('input') input: GetIntegrationLogsInput
  ): Promise<IntegrationLogsResultType> {
    const result = await this.integrationDeliveryService.getLogs(
      input.formId,
      input.integrationId,
      input.limit,
      input.skip
    )

    return {
      logs: result.logs.map((log: any) => ({
        id: log._id?.toString() || log.id,
        formId: log.formId,
        integrationId: log.integrationId,
        appId: log.appId,
        submissionId: log.submissionId,
        endpointUrl: log.endpointUrl,
        responseStatus: log.responseStatus,
        responseBody: log.responseBody,
        executionDurationMs: log.executionDurationMs,
        errorMessage: log.errorMessage,
        attempts: log.attempts,
        status: log.status,
        isAlertSent: log.isAlertSent,
        createdAt: log.createdAt
      })),
      total: result.total
    }
  }
}
