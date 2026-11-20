import { FieldKindEnum } from '@kyndform/shared-types-enums'
import got from 'got'

import { parsePlainAnswer } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'

export interface PodiumConfig {
  apiToken: string
  locationUid: string
  customTag?: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
}

interface RunArgs {
  config: PodiumConfig
  submission: SubmissionModel
  form: FormModel
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
    name: string
    value: string
  }>
}

export function cleanPropertyKey(title: string): string {
  if (!title) return ''
  return title.replace(/\s*\*+\s*$/, '').trim()
}

export function extractPodiumData(submission: SubmissionModel) {
  let email = ''
  let fullName = ''
  let phone = ''
  const attributes: Array<{ name: string; value: string }> = []

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
        /(your|full)?\s*name/i.test(a.title) &&
        typeof a.value === 'string'
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
            attributes.push({
              name: cleanTitle.slice(0, 100),
              value: String(valueToSave).slice(0, 500)
            })
          }
        }
      }
    }
  }

  // Gracefully fallback to email username or 'Website Lead' if submitter didn't provide name
  if (!fullName) {
    if (email) {
      const username = email.split('@')[0]
      fullName = username.charAt(0).toUpperCase() + username.slice(1)
    } else {
      fullName = 'Website Lead'
    }
  }

  return { email, fullName, phone, attributes }
}

export function buildPodiumContactPayload(
  config: PodiumConfig,
  submission: SubmissionModel,
  _form: FormModel
): PodiumContactPayload | null {
  if (!config?.apiToken || !config?.locationUid) {
    return null
  }

  const { email, fullName, phone } = extractPodiumData(submission)

  // Podium requires at least an email or a phone number to create/upsert a contact
  if (!email && !phone) {
    return null
  }

  const cleanLocationUid = config.locationUid.trim()

  const payload: PodiumContactPayload = {
    name: fullName,
    locations: [cleanLocationUid],
    contactStatus: {
      name: 'New Lead'
    }
  }

  // In Podium v4, tags must be UUIDs. If a valid UUID tag is supplied, send it.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (config.customTag?.trim() && uuidRegex.test(config.customTag.trim())) {
    payload.tags = [config.customTag.trim()]
  }

  if (email) {
    payload.email = email
  }

  if (phone) {
    // E.164 cleaning: retain leading + and digits
    const cleanedPhone = phone.replace(/[^\d+]/g, '')
    payload.phoneNumber = cleanedPhone.startsWith('+') ? cleanedPhone : `+1${cleanedPhone}`
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
      name: 'customTag',
      label: 'Automation Trigger Tag (UUID)',
      placeholder: '00000000-0000-0000-0000-000000000000',
      required: false,
      description: 'Optional Podium tag UID to assign to contacts for targeted automations.'
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
  run: async ({ config, submission, form }: RunArgs) => {
    if (!config?.apiToken || !config?.locationUid) return

    let token = config.apiToken.trim()
    let authToken = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`

    const headers = {
      Authorization: authToken,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }

    const payload = buildPodiumContactPayload(config, submission, form)
    if (!payload) return

    const endpointUrl = 'https://api.podium.com/v4/contacts'
    let res: any

    try {
      res = await got.post(endpointUrl, {
        headers,
        json: payload,
        responseType: 'json',
        timeout: 15000,
        retry: 0
      })
    } catch (err: any) {
      // If Podium returns 500 due to an invalid/non-existent tag UID, retry without the tag
      if (err?.response?.statusCode === 500 && payload.tags?.length) {
        try {
          const fallbackPayload = { ...payload }
          delete fallbackPayload.tags
          res = await got.post(endpointUrl, {
            headers,
            json: fallbackPayload,
            responseType: 'json',
            timeout: 15000,
            retry: 0
          })
        } catch {
          // If fallback fails, continue to normal error handling
        }
      }

      // If token expired (401) and we have refresh credentials, auto-refresh and retry once
      if (
        !res &&
        err?.response?.statusCode === 401 &&
        config.refreshToken &&
        config.clientId &&
        config.clientSecret
      ) {
        try {
          const refreshRes: any = await got.post('https://api.podium.com/oauth/token', {
            json: {
              grant_type: 'refresh_token',
              client_id: config.clientId,
              client_secret: config.clientSecret,
              refresh_token: config.refreshToken
            },
            responseType: 'json',
            timeout: 10000
          })

          if (refreshRes?.body?.access_token) {
            token = refreshRes.body.access_token
            config.apiToken = token
            if (refreshRes.body.refresh_token) {
              config.refreshToken = refreshRes.body.refresh_token
            }

            try {
              const { IntegrationModel } = require('@model')
              const formIdentifier = (form as any)?.url || (form as any)?._id
              await IntegrationModel.updateOne(
                { formId: formIdentifier, appId: 'podium' },
                {
                  $set: {
                    'config.apiToken': config.apiToken,
                    'config.refreshToken': config.refreshToken
                  }
                }
              )
            } catch {}

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
        } catch {
          err.diagnosticUrl = endpointUrl
          err.diagnosticMethod = 'POST'
          err.diagnosticPayload = payload
          throw err
        }
      } else if (!res) {
        err.diagnosticUrl = endpointUrl
        err.diagnosticMethod = 'POST'
        err.diagnosticPayload = payload
        throw err
      }
    }

    // If contact was created and a custom tag was configured but omitted/deferred, attempt tagging
    const contactIdentifier = payload.email || payload.phoneNumber
    if (res && config.customTag?.trim() && contactIdentifier) {
      const tagUid = config.customTag.trim()
      const tagEndpoint = `https://api.podium.com/v4/contacts/${encodeURIComponent(contactIdentifier)}/tags/${tagUid}`
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

    return {
      endpointUrl,
      requestMethod: 'POST',
      requestPayload: payload,
      responseStatus: res?.statusCode || 202,
      responseBody: res?.body
    }
  }
}
