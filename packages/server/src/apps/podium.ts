import { FieldKindEnum } from '@kyndform/shared-types-enums'
import got from 'got'

import { parsePlainAnswer } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'

export interface PodiumConfig {
  apiToken: string
  locationUid: string
  customTag?: string
  customTags?: string
  defaultLeadName?: string
  attributeMappings?: Record<string, string>
  useGlobalConnection?: boolean
  refreshToken?: string
  clientId?: string
  clientSecret?: string
}

interface RunArgs {
  config: PodiumConfig
  submission: SubmissionModel
  form: FormModel
  onConfigUpdate?: (updates: Record<string, any>) => Promise<void>
}

export interface PodiumContactPayload {
  name: string
  email?: string
  phoneNumber?: string
  locations: string[]
  tags?: string[]
  contactStatus?: {
    name: string
  }
  attributes?: Array<{
    uid: string
    value: string
  }>
}

export function cleanPropertyKey(title: string): string {
  if (!title) return ''
  return title.replace(/\s*\*+\s*$/, '').trim()
}

export function extractPodiumData(submission: SubmissionModel, config?: PodiumConfig) {
  let email = ''
  let fullName = ''
  let phone = ''
  const attributes: Array<{ uid?: string; name: string; value: string }> = []
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (Array.isArray(submission.answers)) {
    for (const a of submission.answers) {
      if (a.kind === FieldKindEnum.EMAIL && helper.isEmail(a.value)) {
        email = String(a.value).trim().toLowerCase()
      } else if (a.kind === FieldKindEnum.FULL_NAME && a.value && typeof a.value === 'object') {
        const first = a.value.firstName?.trim() || ''
        const last = a.value.lastName?.trim() || ''
        fullName = [first, last].filter(Boolean).join(' ')
      } else if (a.kind === FieldKindEnum.PHONE_NUMBER && a.value) {
        phone = typeof a.value === 'object' ? a.value.phone : String(a.value)
      } else if (!email && a.title && /email/i.test(a.title) && helper.isEmail(a.value)) {
        email = String(a.value).trim().toLowerCase()
      } else if (
        !fullName &&
        a.title &&
        (/(your|full|first)?\s*name/i.test(a.title) ||
          /find\s+the\s+perfect/i.test(a.title) ||
          /dream\s+style/i.test(a.title)) &&
        typeof a.value === 'string' &&
        a.value.trim() !== ''
      ) {
        fullName = a.value.trim()
      }

      if (a.title) {
        const plainValue = parsePlainAnswer(a)
        const valueToSave =
          plainValue !== undefined && plainValue !== null && plainValue !== ''
            ? plainValue
            : typeof a.value === 'object' && a.value !== null
              ? JSON.stringify(a.value)
              : a.value

        if (valueToSave !== undefined && valueToSave !== null && valueToSave !== '') {
          const cleanTitle = cleanPropertyKey(a.title)
          if (cleanTitle) {
            const attrObj: { uid?: string; name: string; value: string } = {
              name: cleanTitle.slice(0, 100),
              value: String(valueToSave).slice(0, 500)
            }
            const possibleUid =
              (a as any).uid ||
              (a as any).attributeUid ||
              config?.attributeMappings?.[cleanTitle] ||
              config?.attributeMappings?.[a.title]

            if (
              possibleUid &&
              typeof possibleUid === 'string' &&
              uuidRegex.test(possibleUid.trim())
            ) {
              attrObj.uid = possibleUid.trim()
            }
            attributes.push(attrObj)
          }
        }
      }
    }
  }

  return { email, fullName, phone, attributes }
}

export function buildPodiumContactPayload(
  config: PodiumConfig,
  submission: SubmissionModel,
  form?: FormModel
): PodiumContactPayload | null {
  if (!config?.apiToken || !config?.locationUid) {
    return null
  }

  const { email, fullName, phone, attributes } = extractPodiumData(submission, config)

  // Podium requires at least an email or a phone number to create/upsert a contact
  if (!email && !phone) {
    return null
  }

  const cleanLocationUid = config.locationUid.trim()

  // Determine lead name with prioritized fallback:
  // 1. Explicitly answered name in form
  // 2. Custom default lead name from integration settings
  // 3. Submitter email username prefix
  // 4. Form Name + " Lead"
  // 5. "Website Lead"
  let leadName = fullName
  if (!leadName) {
    if (config.defaultLeadName?.trim()) {
      leadName = config.defaultLeadName.trim()
    } else if (email) {
      const username = email.split('@')[0]
      leadName = username.charAt(0).toUpperCase() + username.slice(1)
    } else if (form?.name?.trim()) {
      leadName = `${form.name.trim()} Lead`
    } else {
      leadName = 'Website Lead'
    }
  }

  const payload: PodiumContactPayload = {
    name: leadName,
    locations: [cleanLocationUid],
    contactStatus: {
      name: 'New Lead'
    }
  }

  // In Podium v4, attributes require an existing Podium attribute UUID { uid: string, value: string }.
  // Plain { name, value } objects are rejected by Podium with "/attributes/0/uid has Missing field: uid".
  const validAttributes = attributes
    .filter((a): a is { uid: string; name: string; value: string } => Boolean(a?.uid))
    .map(a => ({ uid: a.uid, value: a.value }))
  if (validAttributes.length > 0) {
    payload.attributes = validAttributes
  }

  // In Podium v4, tags must be UUIDs. Parse single or multiple comma-separated UUID tags.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const rawTags = [config.customTag, config.customTags].filter(Boolean).join(',')
  if (rawTags.trim()) {
    const parsedTags = Array.from(
      new Set(
        rawTags
          .split(/[\s,]+/)
          .map(t => t.trim())
          .filter(t => uuidRegex.test(t))
      )
    )
    if (parsedTags.length > 0) {
      payload.tags = parsedTags
    }
  }

  if (email) {
    payload.email = email
  }

  if (phone) {
    // E.164 cleaning: retain leading + and digits; only default to +1 for 10-digit US/CA numbers
    const cleanedPhone = phone.replace(/[^\d+]/g, '')
    if (cleanedPhone.startsWith('+')) {
      payload.phoneNumber = cleanedPhone
    } else if (cleanedPhone.length === 10) {
      payload.phoneNumber = `+1${cleanedPhone}`
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
      payload.phoneNumber = `+${cleanedPhone}`
    } else if (cleanedPhone.length >= 7) {
      payload.phoneNumber = `+${cleanedPhone}`
    }
  }

  return payload
}

export default {
  id: 'podium',
  name: 'Podium',
  icon: '/static/podium.svg',
  description:
    'Automatically sync form submitters and leads directly into Podium Contacts & Conversations.',
  settings: [
    {
      type: 'text',
      name: 'apiToken',
      label: 'Podium API Access Token',
      placeholder: 'Bearer eyJhbGciOi...',
      required: true,
      description:
        'Podium API Bearer access token generated from your Podium Developer Application with write_contacts permission.'
    },
    {
      type: 'text',
      name: 'locationUid',
      label: 'Location UID',
      placeholder: '0f732703-b9a1-5dc4-a05d-387669bdc574',
      required: true,
      description:
        'The Location UID from your Podium account URL (e.g. 0f732703-b9a1-5dc4-a05d-387669bdc574).'
    },
    {
      type: 'text',
      name: 'defaultLeadName',
      label: 'Default Lead Name (Fallback)',
      placeholder: 'e.g. Diamond Quiz Lead',
      required: false,
      description:
        'Custom contact name used when the form has no name field. If left blank, defaults to "{Form Name} Lead".'
    },
    {
      type: 'text',
      name: 'customTag',
      label: 'Automation Trigger Tag(s) (UUID)',
      placeholder: '00000000-0000-0000-0000-000000000000',
      required: false,
      description:
        'Podium Tag UID(s) to assign to contacts for targeted automations. Supports multiple comma-separated UUIDs.'
    },
    {
      type: 'text',
      name: 'refreshToken',
      label: 'OAuth Refresh Token',
      placeholder: '49c48039c0dfcc7...',
      required: false,
      description:
        'Used to automatically generate a fresh access token whenever the current token expires.'
    },
    {
      type: 'text',
      name: 'clientId',
      label: 'OAuth Client ID',
      placeholder: '01a1f072-c542-...',
      required: false,
      description: 'Your Podium Developer App Client ID for automatic token refresh.'
    },
    {
      type: 'text',
      name: 'clientSecret',
      label: 'OAuth Client Secret',
      placeholder: '311364ae...',
      required: false,
      description: 'Your Podium Developer App Client Secret for automatic token refresh.'
    }
  ],
  run: async ({ config, submission, form, onConfigUpdate }: RunArgs) => {
    if (!config?.apiToken || !config?.locationUid) {
      return { skipped: true, reason: 'Missing Podium API token or location UID' }
    }

    let token = config.apiToken.trim().replace(/^Bearer\s+/i, '')
    let authToken = `Bearer ${token}`

    const headers = {
      Authorization: authToken,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }

    const payload = buildPodiumContactPayload(config, submission, form)
    if (!payload) {
      return { skipped: true, reason: 'Submission has neither email nor phone number' }
    }

    const endpointUrl = 'https://api.podium.com/v4/contacts'
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let res: any
    let tagsAppliedOnCreate = Boolean(payload.tags?.length)

    try {
      res = await got.post(endpointUrl, {
        headers,
        json: payload,
        responseType: 'json',
        timeout: 15000,
        retry: 0
      })
    } catch (err: any) {
      // If Podium returns 400 (e.g. invalid tag/attribute) or 500, retry with a clean payload without tags or attributes
      if (
        (err?.response?.statusCode === 400 || err?.response?.statusCode === 500) &&
        (payload.tags?.length || payload.attributes?.length)
      ) {
        try {
          const fallbackPayload: PodiumContactPayload = {
            name: payload.name,
            locations: payload.locations,
            contactStatus: payload.contactStatus
          }
          if (payload.email) fallbackPayload.email = payload.email
          if (payload.phoneNumber) fallbackPayload.phoneNumber = payload.phoneNumber

          res = await got.post(endpointUrl, {
            headers,
            json: fallbackPayload,
            responseType: 'json',
            timeout: 15000,
            retry: 0
          })
          tagsAppliedOnCreate = false
        } catch {
          // If fallback fails, continue to normal error handling
        }
      }

      // If token expired (401) and we have refresh credentials, auto-refresh and retry once
      if (
        !res &&
        err?.response?.statusCode === 401 &&
        config.refreshToken?.trim() &&
        config.clientId?.trim() &&
        config.clientSecret?.trim()
      ) {
        const clientId = config.clientId.trim()
        const clientSecret = config.clientSecret.trim()
        const refreshToken = config.refreshToken.trim()

        try {
          let refreshRes: any
          try {
            // Standard OAuth 2.0 uses application/x-www-form-urlencoded
            refreshRes = await got.post('https://api.podium.com/oauth/token', {
              form: {
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken
              },
              responseType: 'json',
              timeout: 10000
            })
          } catch (formErr: any) {
            // Fallback to json if form-urlencoded fails
            refreshRes = await got.post('https://api.podium.com/oauth/token', {
              json: {
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken
              },
              responseType: 'json',
              timeout: 10000
            })
          }

          if (refreshRes?.body?.access_token) {
            token = String(refreshRes.body.access_token)
              .trim()
              .replace(/^Bearer\s+/i, '')
            config.apiToken = token
            const tokenUpdates: Record<string, any> = { apiToken: config.apiToken }
            if (refreshRes.body.refresh_token) {
              config.refreshToken = String(refreshRes.body.refresh_token).trim()
              tokenUpdates.refreshToken = config.refreshToken
            }

            if (onConfigUpdate) {
              await onConfigUpdate(tokenUpdates)
            }

            authToken = `Bearer ${token}`
            res = await got.post(endpointUrl, {
              headers: {
                Authorization: authToken,
                Accept: 'application/json',
                'Content-Type': 'application/json'
              },
              json: payload,
              responseType: 'json',
              timeout: 15000
            })
          }
        } catch (refreshErr: any) {
          const detail =
            refreshErr?.response?.body?.message ||
            refreshErr?.response?.body?.error_description ||
            refreshErr?.message ||
            'unknown error'
          err.message = `Podium access token expired and auto-refresh failed (${detail}). Please verify OAuth Refresh Token credentials in integration settings.`
          err.diagnosticUrl = endpointUrl
          err.diagnosticMethod = 'POST'
          err.diagnosticPayload = payload
          throw err
        }
      } else if (!res) {
        if (err?.response?.statusCode === 401) {
          err.message =
            'Podium API access token has expired (401 Unauthorized). Please update the access token in integration settings, or configure OAuth Client ID, Secret, and Refresh Token for automatic token renewal.'
        }
        err.diagnosticUrl = endpointUrl
        err.diagnosticMethod = 'POST'
        err.diagnosticPayload = payload
        throw err
      }
    }

    // Only attempt separate tagging if valid UUID tags were configured and not already applied on create
    const contactUid =
      res?.body?.data?.uid || res?.body?.uid || payload.email || payload.phoneNumber
    const rawTags = [config.customTag, config.customTags].filter(Boolean).join(',')
    if (res && !tagsAppliedOnCreate && rawTags.trim() && contactUid) {
      const parsedTags = Array.from(
        new Set(
          rawTags
            .split(/[\s,]+/)
            .map(t => t.trim())
            .filter(t => uuidRegex.test(t))
        )
      )
      for (const tagUid of parsedTags) {
        const tagEndpoint = `https://api.podium.com/v4/contacts/${encodeURIComponent(contactUid)}/tags/${encodeURIComponent(tagUid)}`
        try {
          await got.post(tagEndpoint, {
            headers: {
              Authorization: authToken,
              Accept: 'application/json'
            },
            responseType: 'json',
            timeout: 10000
          })
        } catch {
          // Tagging errors (e.g. tag doesn't exist in Podium) are non-fatal
        }
      }
    }

    return {
      endpointUrl,
      requestMethod: 'POST',
      requestPayload: payload,
      responseStatus: res?.statusCode || 202,
      responseBody: res?.body
    }
  }
}
