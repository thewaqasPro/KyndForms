import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { UpdateIntegrationInput } from '@graphql'
import { helper } from '@kyndform/utils'
import { IntegrationStatusEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AppService, IntegrationService } from '@service'
import { assertSafeOutboundUrl } from '@utils'

@Resolver()
@Auth()
export class UpdateIntegrationSettingsResolver {
  constructor(
    private readonly appService: AppService,
    private readonly integrationService: IntegrationService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  async updateIntegrationSettings(
    @Args('input')
    input: UpdateIntegrationInput
  ): Promise<boolean> {
    const app = this.appService.findById(input.appId)

    if (!app) {
      throw new BadRequestException(`Integration app "${input.appId}" not found`)
    }

    if (helper.isEmpty(input.config)) {
      throw new BadRequestException('Invalid attributes arguments')
    }

    if (app.id === 'webhook') {
      await assertSafeOutboundUrl(input.config.endpointUrl)
    }

    await this.integrationService.createOrUpdate(input.formId, app.id, {
      config: input.config,
      status: IntegrationStatusEnum.ACTIVE,
      consecutiveFailures: 0,
      lastErrorMessage: undefined,
      lastFailureAt: undefined
    })

    return true
  }
}
