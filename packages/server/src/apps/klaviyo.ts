import { FieldKindEnum } from '@kyndform/shared-types-enums'
import got from 'got'

import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'

export interface KlaviyoConfig {
  apiKey: string
  listId: string
}

interface RunArgs {
  config: KlaviyoConfig
  submission: SubmissionModel
  form: FormModel
}

export function buildKlaviyoPayload(
  config: KlaviyoConfig,
  submission: SubmissionModel
): Record<string, any> | null {
  if (!config?.apiKey || !config?.listId) {
    return null
  }

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
      } else if (a.title && a.value !== undefined && a.value !== null && a.value !== '') {
        customProperties[a.title] = a.value
      }
    }
  }

  if (!email) {
    return null
  }

  const profileAttributes: Record<string, any> = {
    email,
    subscriptions: {
      email: {
        marketing: {
          consent: 'SUBSCRIBED'
        }
      }
    }
  }

  if (firstName) profileAttributes.first_name = firstName
  if (lastName) profileAttributes.last_name = lastName
  if (phone) profileAttributes.phone_number = phone
  if (Object.keys(customProperties).length > 0) {
    profileAttributes.properties = customProperties
  }

  return {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: profileAttributes
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
    }
  ],
  run: async ({ config, submission }: RunArgs) => {
    if (!config?.apiKey || !config?.listId) return

    const payload = buildKlaviyoPayload(config, submission)
    if (!payload) return

    const url = 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/'

    await got.post(url, {
      headers: {
        Authorization: `Klaviyo-API-Key ${config.apiKey.trim()}`,
        revision: '2024-02-15',
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      },
      json: payload,
      timeout: 15000,
      retry: 1
    })
  }
}
