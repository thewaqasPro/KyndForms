import { SystemAdmin } from '@decorator'
import { SystemSettingsType, UpdateSystemSettingsInput } from '@graphql'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { SystemSettingService } from '@service'

@Resolver()
@SystemAdmin()
export class AdminSettingResolver {
  constructor(private readonly systemSettingService: SystemSettingService) {}

  @Query(() => SystemSettingsType)
  async systemSettings(): Promise<SystemSettingsType> {
    const settings = await this.systemSettingService.getSettings()
    return {
      allowRegistration: settings.allowRegistration,
      appLogoUrl: settings.appLogoUrl,
      appName: settings.appName,
      maxFormsPerWorkspace: settings.maxFormsPerWorkspace,
      maxSubmissionsPerMonth: settings.maxSubmissionsPerMonth,
      maxUploadFileSizeMB: settings.maxUploadFileSizeMB
    }
  }

  @Mutation(() => SystemSettingsType)
  async updateSystemSettings(
    @Args('input') input: UpdateSystemSettingsInput
  ): Promise<SystemSettingsType> {
    const updated = await this.systemSettingService.updateSettings(input)
    return {
      allowRegistration: updated.allowRegistration,
      appLogoUrl: updated.appLogoUrl,
      appName: updated.appName,
      maxFormsPerWorkspace: updated.maxFormsPerWorkspace,
      maxSubmissionsPerMonth: updated.maxSubmissionsPerMonth,
      maxUploadFileSizeMB: updated.maxUploadFileSizeMB
    }
  }
}
