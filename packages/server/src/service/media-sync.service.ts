import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { S3_BUCKET } from '@environments'
import { helper } from '@kyndform/utils'
import { FormModel, MediaModel } from '@model'

@Injectable()
export class MediaSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MediaSyncService.name)

  constructor(
    @InjectModel(FormModel.name)
    private readonly formModel: Model<FormModel>,
    @InjectModel(MediaModel.name)
    private readonly mediaModel: Model<MediaModel>
  ) {}

  async onApplicationBootstrap() {
    this.syncFromExistingForms().catch(err => {
      this.logger.error('Failed to sync historical assets from existing forms:', err)
    })
  }

  public extractImageUrls(obj: any): string[] {
    const urls: string[] = []

    const visit = (val: any) => {
      if (!val) return
      if (typeof val === 'string') {
        if (
          val.startsWith('http://') ||
          val.startsWith('https://') ||
          val.startsWith('/static/upload/')
        ) {
          const lower = val.toLowerCase()
          if (
            lower.includes('.png') ||
            lower.includes('.jpg') ||
            lower.includes('.jpeg') ||
            lower.includes('.webp') ||
            lower.includes('.gif') ||
            lower.includes('.bmp') ||
            val.includes('/static/upload/') ||
            (helper.isValid(S3_BUCKET) && val.includes(S3_BUCKET))
          ) {
            urls.push(val)
          }
        }
        return
      }

      if (Array.isArray(val)) {
        for (const item of val) {
          visit(item)
        }
        return
      }

      if (typeof val === 'object') {
        for (const key of Object.keys(val)) {
          visit(val[key])
        }
      }
    }

    visit(obj)
    return Array.from(new Set(urls))
  }

  public extractKeyFromUrl(url: string): string | null {
    if (!url) return null

    const staticMatch = url.match(/\/static\/upload\/([^?#]+)/)
    if (staticMatch) {
      return decodeURIComponent(staticMatch[1])
    }

    try {
      const parsed = new URL(url)
      const pathname = parsed.pathname.replace(/^\/+/, '')
      if (helper.isValid(S3_BUCKET) && pathname.startsWith(`${S3_BUCKET}/`)) {
        return decodeURIComponent(pathname.slice(S3_BUCKET.length + 1))
      }
      const parts = pathname.split('/')
      return decodeURIComponent(parts[parts.length - 1])
    } catch {
      return null
    }
  }

  public async syncFromExistingForms(): Promise<{ scannedForms: number; importedAssets: number }> {
    const forms = await this.formModel
      .find({
        projectId: { $exists: true, $ne: null },
        teamId: { $exists: true, $ne: null }
      })
      .select('_id teamId projectId fields themeSettings settings memberId')
      .lean()

    let importedAssets = 0

    for (const form of forms) {
      const teamId = form.teamId
      const projectId = form.projectId
      const formId = String(form._id)
      const userId = form.memberId || 'system'

      if (!teamId || !projectId) continue

      const urls = this.extractImageUrls({
        fields: form.fields,
        themeSettings: form.themeSettings,
        settings: form.settings
      })

      for (const url of urls) {
        const key = this.extractKeyFromUrl(url)
        if (!key) continue

        const existing = await this.mediaModel.findOne({ teamId, key })
        if (!existing) {
          const filename = key
          const ext = key.includes('.') ? key.split('.').pop()?.toLowerCase() : 'png'
          const mimeType = ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/png'

          await this.mediaModel.create({
            teamId,
            projectId,
            formId,
            userId,
            filename,
            key,
            url,
            size: 0,
            mimeType
          })
          importedAssets++
        }
      }
    }

    if (importedAssets > 0) {
      this.logger.log(
        `Historical asset sync complete: imported ${importedAssets} assets across ${forms.length} forms`
      )
    }

    return { scannedForms: forms.length, importedAssets }
  }
}
