import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { RetryIntegrationDeliveryInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, IntegrationDeliveryService, IntegrationService } from '@service'

@Resolver()
@Auth()
export class RetryIntegrationDeliveryResolver {
  constructor(
    private readonly integrationDeliveryService: IntegrationDeliveryService,
    private readonly integrationService: IntegrationService,
    private readonly formService: FormService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  async retryIntegrationDelivery(
    @Args('input') input: RetryIntegrationDeliveryInput
  ): Promise<boolean> {
    const log = await this.integrationDeliveryService.getLogById(input.logId)
    if (!log || log.formId !== input.formId) {
      throw new BadRequestException('Integration delivery log not found')
    }

    const form = await this.formService.findById(input.formId)
    if (!form) {
      throw new BadRequestException('Form not found')
    }

    return this.integrationService.retryDelivery(form, log.submissionId, log.integrationId)
  }
}
