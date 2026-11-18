import { FieldKindEnum } from '@kyndform/shared-types-enums'
import got from 'got'

import { parsePlainAnswer } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'

export interface PodiumConfig {
  apiToken: string
  locationUid: string
  customTag?: string
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
  form: FormModel
): PodiumContactPayload | null {
  if (!config?.apiToken || !config?.locationUid) {
    return null
  }

  const { email, fullName, phone, attributes } = extractPodiumData(submission)

  // Podium requires at least an email or a phone number to create/upsert a contact
  if (!email && !phone) {
    return null
  }

  const cleanLocationUid = config.locationUid.trim()
  const tags: string[] = ['Website Lead', 'KyndFrom Diamond Quiz']
  if (config.customTag?.trim()) {
    const custom = config.customTag.trim()
    if (!tags.includes(custom)) {
      tags.push(custom)
    }
  }
  if (form?.name && !tags.includes(form.name)) {
    tags.push(form.name)
  }

  const payload: PodiumContactPayload = {
    name: fullName,
    locations: [cleanLocationUid],
    tags,
    contactStatus: {
      name: 'New Lead'
    }
  }

  if (email) {
    payload.email = email
  }

  if (phone) {
    // E.164 cleaning: retain leading + and digits
    const cleanedPhone = phone.replace(/[^\d+]/g, '')
    payload.phoneNumber = cleanedPhone.startsWith('+') ? cleanedPhone : `+1${cleanedPhone}`
  }

  if (attributes.length > 0) {
    payload.attributes = attributes
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
      label: 'Automation Trigger Tag',
      placeholder: 'KyndFrom Diamond Quiz',
      required: false,
      description:
        'Tag to apply to the contact in Podium (defaults to "KyndFrom Diamond Quiz" to trigger your $1,500 gift card automation).'
    }
  ],
  run: async ({ config, submission, form }: RunArgs) => {
    if (!config?.apiToken || !config?.locationUid) return

    const token = config.apiToken.trim()
    const authToken = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`

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
        retry: 1
      })
    } catch (err: any) {
      err.diagnosticUrl = endpointUrl
      err.diagnosticMethod = 'POST'
      err.diagnosticPayload = payload
      throw err
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
