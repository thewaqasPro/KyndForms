import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'

import {
  COOKIE_DEVICE_ID_NAME,
  getMulterStorage,
  isUploadFileContentValid,
  saveUploadedFile,
  uploadFileFilter
} from '@config'
import { APP_HOMEPAGE_URL, UPLOAD_FILE_SIZE } from '@environments'
import { helper, timestamp } from '@kyndform/utils'
import {
  AuthService,
  EndpointService,
  FormService,
  MediaService,
  ProjectService,
  RedisService
} from '@service'
import { isAllowedUploadField, md5 } from '@utils'

function getUploadContextValue(
  req: Request,
  key: 'fieldId' | 'formId' | 'openToken'
): string | undefined {
  const kebab = key.replace(/[A-Z]/g, matched => `-${matched.toLowerCase()}`)
  const kyndHeader = `x-kyndform-${kebab}`
  const legacyHeader = `x-kyndform-${kebab}`
  const value = req.get?.(kyndHeader) || req.get?.(legacyHeader) || req.query?.[key]
  const firstValue = Array.isArray(value) ? value[0] : value

  return typeof firstValue === 'string' ? firstValue : undefined
}

@Controller()
export class UploadController {
  constructor(
    private readonly authService: AuthService,
    private readonly endpointService: EndpointService,
    private readonly formService: FormService,
    private readonly redisService: RedisService,
    private readonly mediaService?: MediaService,
    private readonly projectService?: ProjectService
  ) {}

  @Post('/api/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: UPLOAD_FILE_SIZE
      },
      fileFilter: uploadFileFilter,
      storage: getMulterStorage()
    })
  )
  async index(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ filename: string; url: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No supported upload file provided')
    }

    await this.assertUploadAllowed(req)

    if (!isUploadFileContentValid(file)) {
      throw new BadRequestException('The uploaded file contents do not match its file type')
    }

    const savedFile = await saveUploadedFile(file)

    let url: string =
      APP_HOMEPAGE_URL.replace(/\/+$/, '') +
      `/static/upload/${encodeURIComponent(savedFile.filename)}`

    if (savedFile.location) {
      url = savedFile.location
    }

    const sessionId = await this.getAuthenticatedSessionId(req)
    if (sessionId && this.mediaService) {
      let workspaceId = req.get('x-kyndform-workspace-id') || req.get('x-kyndform-team-id')
      let projectId = req.get('x-kyndform-project-id')
      const formId = req.get('x-kyndform-form-id') || (req.query?.formId as string)

      if (formId && (!projectId || !workspaceId)) {
        const form = await this.formService.findById(formId)
        if (form) {
          projectId = projectId || form.projectId
          workspaceId = workspaceId || form.teamId
        }
      }

      if (projectId && !workspaceId && this.projectService) {
        const project = await this.projectService.findById(projectId)
        if (project) {
          workspaceId = project.teamId
        }
      }

      if (workspaceId && projectId) {
        await this.mediaService.create({
          teamId: workspaceId,
          projectId,
          formId,
          userId: sessionId,
          filename: savedFile.originalname,
          key: savedFile.key || savedFile.filename,
          url,
          size: savedFile.size,
          mimeType: savedFile.mimetype
        })
      }
    }

    return {
      filename: savedFile.originalname,
      size: savedFile.size,
      url
    }
  }

  private async assertUploadAllowed(req: Request): Promise<void> {
    const sessionId = await this.getAuthenticatedSessionId(req)

    if (sessionId) {
      await this.redisService.throttler(`upload:session:${md5(sessionId)}`, 300, '1h')
      return
    }

    const fieldId = getUploadContextValue(req, 'fieldId')
    const formId = getUploadContextValue(req, 'formId')
    const openToken = getUploadContextValue(req, 'openToken')

    if (!helper.isValid(formId) || !helper.isValid(openToken) || !helper.isValid(fieldId)) {
      throw new BadRequestException('Invalid upload context')
    }

    const form = await this.formService.findById(formId)

    if (!form || form.suspended || form.settings?.active !== true) {
      throw new BadRequestException('The form is not available')
    }

    const token = this.endpointService.decryptToken(openToken)
    this.endpointService.assertOpenToken(token, formId, form.settings, timestamp())

    if (!isAllowedUploadField(form, fieldId)) {
      throw new BadRequestException('The upload field is not allowed')
    }

    // A public form token is intentionally obtainable by respondents, so cap both reuse of a
    // single token and aggregate orphan uploads for a form. Redis keeps the limit consistent
    // across application replicas.
    await Promise.all([
      this.redisService.throttler(`upload:form:${formId}`, 300, '1h'),
      this.redisService.throttler(`upload:token:${md5(openToken)}`, 10, '1h')
    ])
  }

  private async getAuthenticatedSessionId(req: Request): Promise<string | undefined> {
    const session = this.authService.getSession(req)
    const deviceId = req.get('x-device-id') || req.cookies?.[COOKIE_DEVICE_ID_NAME]

    if (
      helper.isEmpty(session?.id) ||
      helper.isEmpty(session?.deviceId) ||
      deviceId !== session.deviceId
    ) {
      return
    }

    if (await this.authService.isExpired(session.id, session.deviceId)) {
      return
    }

    return session.id
  }
}
