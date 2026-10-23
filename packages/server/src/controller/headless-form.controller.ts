import {
  Answer,
  CaptchaKindEnum,
  FieldKindEnum,
  FormField,
  HiddenField,
  HiddenFieldAnswer,
  SubmissionCategoryEnum,
  SubmissionStatusEnum
} from '@kyndform/shared-types-enums'
import {
  BadRequestException,
  Controller,
  NotFoundException,
  Options,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import type { Request, Response } from 'express'

import {
  getMulterStorage,
  isUploadFileContentValid,
  normalizeCorsOrigin,
  saveUploadedFile,
  uploadFileFilter
} from '@config'
import { APP_HOMEPAGE_URL, UPLOAD_FILE_SIZE } from '@environments'
import { htmlUtils } from '@kyndform/answer-utils'
import { helper, nanoid, timestamp } from '@kyndform/utils'
import { FormModel } from '@model'
import {
  EndpointService,
  FormReportService,
  FormService,
  IntegrationService,
  RedisService,
  SubmissionIpLimitService,
  SubmissionService
} from '@service'
import { ClientInfo, HttpClient, assertFormIsAcceptingSubmissions, passwordVerify } from '@utils'

const SYSTEM_CONTROL_KEYS = new Set([
  '_next',
  '_redirect',
  '_gotcha',
  '_honeypot',
  '_bot',
  '_subject',
  '_replyto',
  '_email',
  '_captcha',
  '_password',
  'g-recaptcha-response',
  'cf-turnstile-response'
])

function isHiddenFieldKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    lower.startsWith('utm_') ||
    lower.startsWith('affiliate') ||
    lower.startsWith('ref_') ||
    lower === 'referrer' ||
    lower === 'ref' ||
    lower === 'client_id' ||
    lower === 'session_id' ||
    (key.startsWith('_') && !SYSTEM_CONTROL_KEYS.has(key))
  )
}

function formatFieldTitle(key: string): string {
  return key
    .replace(/^_+/, '')
    .replace(/\[\]$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
}

function getFieldPlainTitle(field: FormField): string {
  if (typeof field.title === 'string') {
    return field.title
  }
  if (helper.isArray(field.title)) {
    return htmlUtils.plain(htmlUtils.serialize(field.title as any))
  }
  return field.label || ''
}

function inferFieldKind(key: string, value: any, isUploadedFile = false): FieldKindEnum {
  const lowerKey = key.toLowerCase()

  if (isUploadedFile) {
    return FieldKindEnum.FILE_UPLOAD
  }

  if (
    lowerKey === 'name' ||
    lowerKey === 'fullname' ||
    lowerKey === 'full_name' ||
    lowerKey === 'first_name' ||
    (typeof value === 'object' && value !== null && ('firstName' in value || 'lastName' in value))
  ) {
    return FieldKindEnum.FULL_NAME
  }

  if (lowerKey.includes('email') || (typeof value === 'string' && helper.isEmail(value))) {
    return FieldKindEnum.EMAIL
  }

  if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) {
    return FieldKindEnum.PHONE_NUMBER
  }

  if (
    lowerKey.includes('url') ||
    lowerKey.includes('website') ||
    lowerKey.includes('link') ||
    (typeof value === 'string' && helper.isURL(value))
  ) {
    return FieldKindEnum.URL
  }

  if (
    lowerKey.includes('location') ||
    lowerKey.includes('address') ||
    lowerKey.includes('coordinates') ||
    (typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      ('latitude' in value || 'lat' in value || 'city' in value || 'address1' in value))
  ) {
    return FieldKindEnum.ADDRESS
  }

  if (
    Array.isArray(value) ||
    key.endsWith('[]') ||
    lowerKey.includes('interests') ||
    lowerKey.includes('tags') ||
    lowerKey.includes('categories')
  ) {
    return FieldKindEnum.MULTIPLE_CHOICE
  }

  if (
    typeof value === 'boolean' ||
    lowerKey.startsWith('is_') ||
    lowerKey.startsWith('has_') ||
    lowerKey.includes('agree') ||
    lowerKey.includes('subscribe') ||
    lowerKey.includes('opt_in')
  ) {
    return FieldKindEnum.YES_NO
  }

  if (
    typeof value === 'number' ||
    (!isNaN(Number(value)) &&
      typeof value === 'string' &&
      value.trim() !== '' &&
      (lowerKey.includes('amount') ||
        lowerKey.includes('budget') ||
        lowerKey.includes('price') ||
        lowerKey.includes('age') ||
        lowerKey.includes('count') ||
        lowerKey.includes('quantity')))
  ) {
    return FieldKindEnum.NUMBER
  }

  if (lowerKey.includes('date') || lowerKey.includes('birthday') || lowerKey.includes('deadline')) {
    return FieldKindEnum.DATE
  }

  if (
    (typeof value === 'string' && value.length > 100) ||
    lowerKey.includes('message') ||
    lowerKey.includes('comment') ||
    lowerKey.includes('description') ||
    lowerKey.includes('notes') ||
    lowerKey.includes('bio')
  ) {
    return FieldKindEnum.LONG_TEXT
  }

  return FieldKindEnum.SHORT_TEXT
}

function isJsonRequest(req: Request): boolean {
  const accept = req.headers.accept || ''
  const contentType = req.headers['content-type'] || ''
  return req.xhr || accept.includes('application/json') || contentType.includes('application/json')
}

function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch (_) {
    return false
  }
}

function isRedirectAllowed(targetUrl: string, allowedDomains: string[] = []): boolean {
  if (!isValidRedirectUrl(targetUrl)) {
    return false
  }
  try {
    const target = new URL(targetUrl)
    const appOrigin = new URL(APP_HOMEPAGE_URL).origin.toLowerCase()
    if (target.origin.toLowerCase() === appOrigin) {
      return true
    }

    return allowedDomains.some(domain => {
      if (!domain || typeof domain !== 'string') return false
      const trimmed = domain.trim().toLowerCase()
      if (trimmed === '*') return true
      try {
        const parsedDomain = trimmed.includes('://')
          ? new URL(trimmed)
          : new URL(`https://${trimmed}`)
        return (
          parsedDomain.origin.toLowerCase() === target.origin.toLowerCase() ||
          parsedDomain.hostname.toLowerCase() === target.hostname.toLowerCase()
        )
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

@Controller()
export class HeadlessFormController {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService,
    private readonly endpointService: EndpointService,
    private readonly submissionIpLimitService: SubmissionIpLimitService,
    private readonly formReportService: FormReportService,
    private readonly integrationService: IntegrationService,
    private readonly redisService: RedisService
  ) {}

  private setCorsHeaders(form: FormModel | null, req: Request, res: Response): void {
    const requestOrigin = req.headers.origin as string | undefined
    const allowedDomains = (form?.settings as any)?.allowedDomains as string[] | undefined

    if (requestOrigin) {
      if (
        helper.isValidArray(allowedDomains) &&
        allowedDomains.length > 0 &&
        !allowedDomains.includes('*')
      ) {
        const originNormalized = normalizeCorsOrigin(requestOrigin)
        const isAllowed = allowedDomains.some(d => {
          const norm = normalizeCorsOrigin(d)
          return norm === originNormalized || d.trim() === requestOrigin
        })

        if (isAllowed) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin)
        }
      } else {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*')
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*')
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, X-Requested-With, Authorization, x-anonymous-id, x-device-id, x-form-password'
    )
    res.setHeader('Access-Control-Max-Age', '86400')
  }

  @Options('/f/:formId')
  @Options('/api/f/:formId')
  async handleCorsPreflight(
    @Param('formId') formId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const form = await this.formService.findById(formId)
    this.setCorsHeaders(form, req, res)
    return res.status(204).end()
  }

  @Post('/f/:formId')
  @Post('/api/f/:formId')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: UPLOAD_FILE_SIZE
      },
      fileFilter: uploadFileFilter,
      storage: getMulterStorage()
    })
  )
  async submit(
    @Param('formId') formId: string,
    @HttpClient() client: ClientInfo,
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const form = await this.formService.findById(formId)
    this.setCorsHeaders(form, req, res)

    const isJson = isJsonRequest(req)

    if (!form) {
      if (isJson) {
        return res.status(404).json({ success: false, error: 'The form does not exist' })
      }
      throw new NotFoundException('The form does not exist')
    }

    if (form.suspended) {
      if (isJson) {
        return res.status(403).json({ success: false, error: 'The form is suspended' })
      }
      throw new BadRequestException('The form is suspended')
    }

    if (form.settings?.active !== true) {
      if (isJson) {
        return res.status(400).json({ success: false, error: 'The form is not active' })
      }
      throw new BadRequestException('The form is not active')
    }

    // Form Password verification if required
    if (form.settings?.requirePassword) {
      const providedPassword =
        (req.body?._password as string) || (req.headers['x-form-password'] as string)
      if (
        !providedPassword ||
        !form.settings.password ||
        !(await passwordVerify(providedPassword, form.settings.password))
      ) {
        if (isJson) {
          return res.status(400).json({ success: false, error: 'The password does not match' })
        }
        throw new BadRequestException('The password does not match')
      }
    }

    const now = timestamp()
    try {
      assertFormIsAcceptingSubmissions(form.settings, now)
    } catch (err) {
      if (isJson) {
        return res.status(400).json({ success: false, error: err.message })
      }
      throw err
    }

    // IP Rate Limit check
    if (
      form.settings?.enableIpLimit &&
      helper.isValid(form.settings.ipLimitCount) &&
      form.settings.ipLimitCount > 0
    ) {
      try {
        await this.submissionIpLimitService.checkIp(form, client.ip)
      } catch (err) {
        if (isJson) {
          return res.status(429).json({ success: false, error: err.message || 'IP limit reached' })
        }
        throw err
      }
    }

    // Merge request body and uploaded files
    const rawBody: Record<string, any> = { ...(req.body || {}) }
    const uploadedFieldNames = new Set<string>()

    // Process file uploads
    if (helper.isValidArray(files) && files.length > 0) {
      await this.redisService.throttler(`upload:form:${form.id}`, 300, '1h')
      for (const file of files) {
        if (!isUploadFileContentValid(file)) {
          throw new BadRequestException(`Invalid file content for ${file.originalname || 'upload'}`)
        }

        const fieldname = file.fieldname || 'file'
        uploadedFieldNames.add(fieldname)
        const savedFile = await saveUploadedFile(file)
        let fileUrl: string =
          APP_HOMEPAGE_URL.replace(/\/+$/, '') +
          `/static/upload/${encodeURIComponent(savedFile.filename)}`

        if (savedFile.location) {
          fileUrl = savedFile.location
        }

        const fileValue = {
          filename: savedFile.originalname,
          size: savedFile.size,
          url: fileUrl
        }

        if (rawBody[fieldname]) {
          if (Array.isArray(rawBody[fieldname])) {
            rawBody[fieldname].push(fileValue)
          } else {
            rawBody[fieldname] = [rawBody[fieldname], fileValue]
          }
        } else {
          rawBody[fieldname] = fileValue
        }
      }
    }

    // Anti-Spam Check 1: Honeypot
    let category = SubmissionCategoryEnum.INBOX
    const honeypotVal = rawBody._gotcha || rawBody._honeypot || rawBody._bot || rawBody['']
    if (helper.isValid(honeypotVal) && String(honeypotVal).trim() !== '') {
      category = SubmissionCategoryEnum.SPAM
    }

    // reCAPTCHA verification if enabled
    if (form.settings?.captchaKind === CaptchaKindEnum.GOOGLE_RECAPTCHA) {
      const captchaToken = rawBody['g-recaptcha-response'] || rawBody._captcha || rawBody.recaptcha
      if (!captchaToken) {
        if (isJson) {
          return res.status(400).json({ success: false, error: 'Captcha token is required' })
        }
        throw new BadRequestException('Captcha token is required')
      }
      await this.endpointService.antiBotCheck(CaptchaKindEnum.GOOGLE_RECAPTCHA, {
        captchaToken
      } as any)
    }

    // Process Answers & Hidden Fields
    const answers: Answer[] = []
    const hiddenFields: HiddenFieldAnswer[] = []
    const formFields = [...(form.fields || [])]
    const formHiddenFields = [...(form.hiddenFields || [])]
    const newFormFields: FormField[] = []
    const newHiddenFields: HiddenField[] = []

    for (const [key, value] of Object.entries(rawBody)) {
      if (SYSTEM_CONTROL_KEYS.has(key)) {
        continue
      }

      if (isHiddenFieldKey(key)) {
        hiddenFields.push({
          id: key,
          name: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
        })

        if (!formHiddenFields.some(h => h.id === key || h.name === key)) {
          const newHf: HiddenField = { id: key, name: key }
          newHiddenFields.push(newHf)
          formHiddenFields.push(newHf)
        }
        continue
      }

      const isUploadedFile = uploadedFieldNames.has(key)
      let formattedValue = value
      // Treat non-file objects with filename/url as text so attackers cannot spoof file upload URLs in notification emails
      if (
        !isUploadedFile &&
        value &&
        typeof value === 'object' &&
        ('filename' in value || 'url' in value)
      ) {
        formattedValue = JSON.stringify(value)
      }

      // Check if matching field already exists in form.fields
      const lowerKey = key.toLowerCase().trim()
      let existingField = formFields.find(f => {
        const plainTitle = getFieldPlainTitle(f).toLowerCase().trim()
        const label = (f.label || '').toLowerCase().trim()
        return (
          f.id === key ||
          label === lowerKey ||
          plainTitle === lowerKey ||
          (lowerKey === 'name' &&
            (f.kind === FieldKindEnum.FULL_NAME || plainTitle === 'full name')) ||
          (lowerKey === 'phone' &&
            (f.kind === FieldKindEnum.PHONE_NUMBER || plainTitle === 'phone number'))
        )
      })

      if (!existingField) {
        if (
          key.length <= 100 &&
          formFields.length < 100 &&
          newFormFields.length < 25 &&
          (form.settings as any)?.autoCreateFields !== false
        ) {
          const fieldKind = inferFieldKind(key, formattedValue, isUploadedFile)
          const fieldTitle = formatFieldTitle(key)
          const fieldId = nanoid(8)

          existingField = {
            id: fieldId,
            title: fieldTitle,
            label: fieldTitle,
            kind: fieldKind
          }

          newFormFields.push(existingField)
          formFields.push(existingField)
        } else {
          const fieldKind = inferFieldKind(key, formattedValue, isUploadedFile)
          const fieldTitle = formatFieldTitle(key)
          existingField = {
            id: nanoid(8),
            title: fieldTitle,
            label: fieldTitle,
            kind: fieldKind
          }
        }
      }

      if (existingField.kind === FieldKindEnum.FULL_NAME && typeof value === 'string') {
        const parts = value.trim().split(/\s+/)
        formattedValue = {
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ')
        }
      }

      const answerKind =
        !isUploadedFile && existingField.kind === FieldKindEnum.FILE_UPLOAD
          ? FieldKindEnum.SHORT_TEXT
          : existingField.kind

      answers.push({
        id: existingField.id,
        title:
          typeof existingField.title === 'string'
            ? existingField.title
            : getFieldPlainTitle(existingField) || formatFieldTitle(key),
        kind: answerKind,
        properties: existingField.properties || {},
        value: formattedValue
      })
    }

    // If new dynamic fields or hidden fields were discovered, update form schema with Redis lock
    if (newFormFields.length > 0 || newHiddenFields.length > 0) {
      await this.redisService.withLock(`headless-schema:${form.id}`, '10s', async () => {
        const currentForm = await this.formService.findById(form.id)
        if (!currentForm) {
          return
        }

        const updatePayload: Record<string, any> = {
          fieldsUpdatedAt: now
        }
        let shouldUpdate = false

        if (newFormFields.length > 0 && (currentForm.settings as any)?.autoCreateFields !== false) {
          const currentFields = [...(currentForm.fields || [])]
          for (const newField of newFormFields) {
            if (!currentFields.some(f => f.id === newField.id || f.label === newField.label)) {
              currentFields.push(newField)
            }
          }
          updatePayload.fields = currentFields
          if (!currentForm._drafts || currentForm._drafts === JSON.stringify(currentForm.fields)) {
            updatePayload._drafts = JSON.stringify(currentFields)
          }
          shouldUpdate = true
        }

        if (newHiddenFields.length > 0) {
          const currentHidden = [...(currentForm.hiddenFields || [])]
          for (const newHf of newHiddenFields) {
            if (!currentHidden.some(h => h.id === newHf.id || h.name === newHf.name)) {
              currentHidden.push(newHf)
            }
          }
          updatePayload.hiddenFields = currentHidden
          shouldUpdate = true
        }

        if (shouldUpdate) {
          await this.formService.update(form.id, updatePayload)
        }
      })
    }

    // Akismet spam check if enabled
    if (form.settings?.filterSpam && category !== SubmissionCategoryEnum.SPAM) {
      const isSpam = await this.endpointService.verifySpam({
        answers,
        ip: client.ip
      })
      if (isSpam) {
        category = SubmissionCategoryEnum.SPAM
      }
    }

    let status = SubmissionStatusEnum.PUBLIC
    if (form.settings?.allowArchive === false) {
      status = SubmissionStatusEnum.PRIVATE
    }

    const quotaLimit =
      form.settings?.enableQuotaLimit &&
      helper.isValid(form.settings.quotaLimit) &&
      form.settings.quotaLimit! > 0
        ? form.settings.quotaLimit
        : undefined

    const submissionId = await this.submissionService.createWithinQuota(
      {
        teamId: form.teamId,
        formId: form.id,
        category,
        title: form.name,
        answers,
        hiddenFields,
        startAt: now,
        endAt: now,
        ip: client.ip,
        userAgent: client.userAgent,
        status
      },
      quotaLimit
    )

    // Form report Queue
    this.formReportService.addQueue(form.id)

    // Integration Queue (Email notifications, Webhooks, Zapier, Slack, etc.)
    this.integrationService.addQueue(form, submissionId)

    // Response formatting
    if (isJson) {
      return res.status(200).json({
        success: true,
        submissionId,
        message: 'Submission received successfully'
      })
    }

    // HTML Form Redirection
    let redirectUrl: string | undefined

    const userRedirect = rawBody._next || rawBody._redirect
    if (helper.isValid(userRedirect) && typeof userRedirect === 'string') {
      if (isRedirectAllowed(userRedirect, form.settings?.allowedDomains)) {
        redirectUrl = userRedirect
      }
    }

    if (!redirectUrl) {
      const ownerRedirect = (form.settings as any)?.defaultRedirectUrl || form.settings?.redirectUrl
      if (
        helper.isValid(ownerRedirect) &&
        typeof ownerRedirect === 'string' &&
        isValidRedirectUrl(ownerRedirect)
      ) {
        redirectUrl = ownerRedirect
      }
    }

    if (redirectUrl) {
      return res.redirect(302, redirectUrl)
    }

    return res.render('form-submitted', {
      message: 'Your response has been recorded.',
      backUrl: req.get('referer') || undefined
    })
  }
}
