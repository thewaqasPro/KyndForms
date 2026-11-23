import { BadRequestException } from '@nestjs/common'

import { Auth, Team, TeamGuard } from '@decorator'
import {
  UpdateWorkspaceIntegrationInput,
  WorkspaceIntegrationInput,
  WorkspaceIntegrationType
} from '@graphql'
import { helper } from '@kyndform/utils'
import { TeamModel } from '@model'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AppService, IntegrationService } from '@service'

@Resolver()
@Auth()
export class WorkspaceIntegrationResolver {
  constructor(
    private readonly appService: AppService,
    private readonly integrationService: IntegrationService
  ) {}

  @Query(returns => WorkspaceIntegrationType, { nullable: true })
  @TeamGuard()
  async workspaceIntegration(
    @Args('input') input: WorkspaceIntegrationInput
  ): Promise<WorkspaceIntegrationType | null> {
    const item = await this.integrationService.findWorkspaceIntegration(input.teamId, input.appId)
    if (!item) return null

    return {
      id: item.id,
      teamId: item.teamId,
      appId: item.appId,
      config: helper.isEmpty(item.config) ? {} : (item.config as any),
      createdAt: (item as any).createdAt,
      updatedAt: (item as any).updatedAt
    }
  }

  @Query(returns => [WorkspaceIntegrationType])
  @TeamGuard()
  async workspaceIntegrations(@Args('teamId') teamId: string): Promise<WorkspaceIntegrationType[]> {
    const items = await this.integrationService.findAllWorkspaceIntegrations(teamId)
    return items.map(item => ({
      id: item.id,
      teamId: item.teamId,
      appId: item.appId,
      config: helper.isEmpty(item.config) ? {} : (item.config as any),
      createdAt: (item as any).createdAt,
      updatedAt: (item as any).updatedAt
    }))
  }

  @Mutation(returns => Boolean)
  @TeamGuard()
  async updateWorkspaceIntegrationSettings(
    @Team() team: TeamModel,
    @Args('input') input: UpdateWorkspaceIntegrationInput
  ): Promise<boolean> {
    if (!team.isOwner) {
      throw new BadRequestException("You don't have permission to change the workspace settings")
    }

    const app = this.appService.findById(input.appId)
    if (!app) {
      throw new BadRequestException(`Integration app "${input.appId}" not found`)
    }

    await this.integrationService.setWorkspaceIntegrationConfig(
      input.teamId,
      input.appId,
      input.config
    )
    return true
  }

  @Mutation(returns => Boolean)
  @TeamGuard()
  async deleteWorkspaceIntegrationSettings(
    @Team() team: TeamModel,
    @Args('input') input: WorkspaceIntegrationInput
  ): Promise<boolean> {
    if (!team.isOwner) {
      throw new BadRequestException("You don't have permission to change the workspace settings")
    }

    return this.integrationService.deleteWorkspaceIntegration(input.teamId, input.appId)
  }
}
