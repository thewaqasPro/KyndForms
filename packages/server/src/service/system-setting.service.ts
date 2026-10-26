import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { APP_DISABLE_REGISTRATION } from '@environments'
import { SystemSettingModel } from '@model'

@Injectable()
export class SystemSettingService {
  private readonly logger = new Logger(SystemSettingService.name)
  private cachedSettings: SystemSettingModel | null = null
  private lastFetchedAt = 0
  private readonly CACHE_TTL_MS = 10000 // 10 seconds

  constructor(
    @InjectModel(SystemSettingModel.name)
    private readonly systemSettingModel: Model<SystemSettingModel>
  ) {}

  async getSettings(): Promise<SystemSettingModel> {
    const now = Date.now()
    if (this.cachedSettings && now - this.lastFetchedAt < this.CACHE_TTL_MS) {
      return this.cachedSettings
    }

    let settings = await this.systemSettingModel.findOne({ key: 'global' })
    if (!settings) {
      try {
        settings = await this.systemSettingModel.create({
          key: 'global',
          allowRegistration: !APP_DISABLE_REGISTRATION,
          appName: 'KyndForm',
          maxFormsPerWorkspace: 0,
          maxSubmissionsPerMonth: 0,
          maxUploadFileSizeMB: 20
        })
      } catch (err) {
        // If race condition on creation, find again
        settings = await this.systemSettingModel.findOne({ key: 'global' })
      }
    }

    this.cachedSettings = settings
    this.lastFetchedAt = now
    return settings!
  }

  async updateSettings(updates: Partial<SystemSettingModel>): Promise<SystemSettingModel> {
    const updated = await this.systemSettingModel.findOneAndUpdate(
      { key: 'global' },
      { $set: updates },
      { new: true, upsert: true }
    )
    this.cachedSettings = updated
    this.lastFetchedAt = Date.now()
    this.logger.log('System settings updated successfully')
    return updated
  }

  async isRegistrationAllowed(): Promise<boolean> {
    const settings = await this.getSettings()
    return settings.allowRegistration !== false
  }

  async getRuntimeBranding() {
    const settings = await this.getSettings()
    return {
      appName: settings.appName || 'KyndForm',
      appLogoUrl: settings.appLogoUrl || '',
      allowRegistration: settings.allowRegistration,
      appDisableRegistration: !settings.allowRegistration,
      maxFormsPerWorkspace: settings.maxFormsPerWorkspace || 0,
      maxSubmissionsPerMonth: settings.maxSubmissionsPerMonth || 0,
      maxUploadFileSizeMB: settings.maxUploadFileSizeMB || 20
    }
  }
}
