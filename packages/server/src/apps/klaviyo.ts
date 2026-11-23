import { FieldKindEnum } from '@kyndform/shared-types-enums'
import got from 'got'

import { parsePlainAnswer } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'

export interface KlaviyoConfig {
  apiKey: string
  listId: string
  subscribeToMarketing?: boolean | string
}

interface RunArgs {
  config: KlaviyoConfig
  submission: SubmissionModel
  form: FormModel
}

export interface KlaviyoProfilePayload {
  data: {
    type: 'profile'
    attributes: {
      email: string
      first_name?: string
      last_name?: string
      phone_number?: string
      properties?: Record<string, any>
    }
  }
}

export interface KlaviyoSubscribePayload {
  data: {
    type: 'profile-subscription-bulk-create-job'
    attributes: {
      profiles: {
        data: Array<{
          type: 'profile'
          attributes: {
            email: string
            subscriptions: {
              email: {
                marketing: {
                  consent: 'SUBSCRIBED'
                }
              }
            }
          }
        }>
      }
    }
    relationships: {
      list: {
        data: {
          type: 'list'
          id: string
        }
      }
    }
  }
}

export function cleanPropertyKey(title: string): string {
  if (!title) return ''
  return title.replace(/\s*\*+\s*$/, '').trim()
}

export function normalizeKlaviyoPhone(phone: string): string | undefined {
  if (!phone) return undefined
  const cleaned = phone.replace(/[^\d+]/g, '')
  let e164 = ''
  if (cleaned.startsWith('+')) {
    e164 = cleaned
  } else if (cleaned.length === 10) {
    e164 = `+1${cleaned}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    e164 = `+${cleaned}`
  }
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : undefined
}

export function extractKlaviyoData(submission: SubmissionModel) {
  let email = ''
  let firstName = ''
  let lastName = ''
  let phone = ''
  const customProperties: Record<string, any> = {}

  if (Array.isArray(submission.answers)) {
    for (const a of submission.answers) {
      if (a.kind === FieldKindEnum.EMAIL && helper.isEmail(a.value)) {
        email = String(a.value).trim().toLowerCase()
      } else if (a.kind === FieldKindEnum.FULL_NAME && a.value && typeof a.value === 'object') {
        firstName = a.value.firstName || ''
        lastName = a.value.lastName || ''
      } else if (a.kind === FieldKindEnum.PHONE_NUMBER && a.value) {
        phone = typeof a.value === 'object' ? a.value.phone : String(a.value)
      } else if (!email && a.title && /email/i.test(a.title) && helper.isEmail(a.value)) {
        email = String(a.value).trim().toLowerCase()
      }

      if (a.title) {
        // Resolve choice IDs, ratings, objects, etc. into their human-readable labels
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
            customProperties[cleanTitle] = valueToSave
          }
          // Also set the original raw title if it had an asterisk, for backward-compatibility
          if (a.title !== cleanTitle) {
            customProperties[a.title] = valueToSave
          }
        }
      }
    }
  }

  return { email, firstName, lastName, phone, customProperties }
}

export function buildKlaviyoProfilePayload(
  submission: SubmissionModel
): KlaviyoProfilePayload | null {
  const { email, firstName, lastName, phone, customProperties } = extractKlaviyoData(submission)

  if (!email) {
    return null
  }

  const attributes: KlaviyoProfilePayload['data']['attributes'] = { email }
  if (firstName) attributes.first_name = firstName
  if (lastName) attributes.last_name = lastName
  const normalizedPhone = normalizeKlaviyoPhone(phone)
  if (normalizedPhone) attributes.phone_number = normalizedPhone
  if (Object.keys(customProperties).length > 0) {
    attributes.properties = customProperties
  }

  return {
    data: {
      type: 'profile',
      attributes
    }
  }
}

export function buildKlaviyoSubscribePayload(
  config: KlaviyoConfig,
  submission: SubmissionModel
): KlaviyoSubscribePayload | null {
  if (!config?.apiKey || !config?.listId) {
    return null
  }

  const { email } = extractKlaviyoData(submission)
  if (!email) {
    return null
  }

  return {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: {
                email,
                subscriptions: {
                  email: {
                    marketing: {
                      consent: 'SUBSCRIBED'
                    }
                  }
                }
              }
            }
          ]
        }
      },
      relationships: {
        list: {
          data: {
            type: 'list',
            id: config.listId.trim()
          }
        }
      }
    }
  }
}

// Retained for backward-compatibility with existing tests/callers
export function buildKlaviyoPayload(
  config: KlaviyoConfig,
  submission: SubmissionModel
): KlaviyoSubscribePayload | null {
  return buildKlaviyoSubscribePayload(config, submission)
}

export default {
  id: 'klaviyo',
  name: 'Klaviyo',
  description:
    'Sync form respondents and subscribers into your Klaviyo Lists and Profiles for email campaigns.',
  icon: '/static/klaviyo.svg',
  settings: [
    {
      type: 'text',
      name: 'apiKey',
      label: 'Klaviyo Private API Key',
      placeholder: 'e.g. pk_1a2b3c4d5e6f7g8h9i0j',
      required: true,
      description:
        'Private API Key generated from Klaviyo Settings > API Keys with List and Profile write access'
    },
    {
      type: 'text',
      name: 'listId',
      label: 'Klaviyo List ID',
      placeholder: 'e.g. XyZ123',
      required: true,
      description:
        'The 6-character List ID from your Klaviyo Audience > Lists & Segments list settings'
    },
    {
      type: 'text',
      name: 'subscribeToMarketing',
      label: 'Subscribe to Email Marketing (true/false)',
      placeholder: 'true',
      required: false,
      description:
        'Set to false to import profiles without automatically setting email marketing consent to SUBSCRIBED.'
    }
  ],
  run: async ({ config, submission }: RunArgs) => {
    if (!config?.apiKey || !config?.listId) {
      return { skipped: true, reason: 'Missing Klaviyo API key or List ID' }
    }

    const apiKey = config.apiKey.trim()
    const headers = {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: '2024-02-15',
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json'
    }

    const profilePayload = buildKlaviyoProfilePayload(submission)
    if (!profilePayload) {
      return { skipped: true, reason: 'Submission does not contain a valid email address' }
    }

    let profileRes: any
    // 1. Upsert profile with full details (Name, Phone, Custom Form Answers)
    try {
      profileRes = await got.post('https://a.klaviyo.com/api/profile-import/', {
        headers,
        json: profilePayload,
        responseType: 'json',
        timeout: 15000,
        retry: 1
      })
    } catch (err: any) {
      err.diagnosticUrl = 'https://a.klaviyo.com/api/profile-import/'
      err.diagnosticMethod = 'POST'
      err.diagnosticPayload = profilePayload
      throw err
    }

    const shouldSubscribe =
      config.subscribeToMarketing !== false &&
      String(config.subscribeToMarketing ?? 'true')
        .trim()
        .toLowerCase() !== 'false'

    if (!shouldSubscribe) {
      return {
        endpointUrl: 'https://a.klaviyo.com/api/profile-import/',
        requestMethod: 'POST',
        requestPayload: {
          profileImport: profilePayload
        },
        responseStatus: profileRes?.statusCode || 200,
        responseBody: {
          profileImportStatus: profileRes?.statusCode || 200,
          profileImport: profileRes?.body
        }
      }
    }

    // 2. Subscribe profile to the specified list with marketing consent
    const subscribePayload = buildKlaviyoSubscribePayload(config, submission)
    if (!subscribePayload) {
      return { skipped: true, reason: 'Unable to build Klaviyo subscription payload' }
    }

    let subscribeRes: any
    try {
      subscribeRes = await got.post(
        'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
        {
          headers,
          json: subscribePayload,
          responseType: 'json',
          timeout: 15000,
          retry: 1
        }
      )
    } catch (err: any) {
      err.diagnosticUrl = 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/'
      err.diagnosticMethod = 'POST'
      err.diagnosticPayload = subscribePayload
      throw err
    }

    return {
      endpointUrl: 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      requestMethod: 'POST',
      requestPayload: {
        profileImport: profilePayload,
        listSubscription: subscribePayload
      },
      responseStatus: subscribeRes?.statusCode || 202,
      responseBody: {
        profileImportStatus: profileRes?.statusCode || 200,
        listSubscriptionStatus: subscribeRes?.statusCode || 202,
        profileImport: profileRes?.body,
        listSubscription: subscribeRes?.body
      }
    }
  }
}
