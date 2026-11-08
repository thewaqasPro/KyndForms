import got from 'got'

import { FormModel, SubmissionModel } from '@model'
import { assertSafeOutboundRequest } from '@utils'

export interface ZapierConfig {
  webhookUrl: string
}

interface RunArgs {
  config: ZapierConfig
  submission: SubmissionModel
  form: FormModel
}

export default {
  id: 'zapier',
  name: 'Zapier',
  description: 'Connect KyndForm to 5,000+ apps on Zapier using a Zapier Catch Hook.',
  icon: '/static/zapier.svg',
  settings: [
    {
      type: 'url',
      name: 'webhookUrl',
      label: 'Zapier Webhook URL',
      placeholder: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
      required: true,
      description: 'The Catch Hook URL generated when creating your Zap in Zapier'
    }
  ],
  run: async ({ config, submission, form }: RunArgs) => {
    if (!config?.webhookUrl) return

    const { lookup, url } = await assertSafeOutboundRequest(config.webhookUrl)

    const answersMap: Record<string, unknown> = {}
    if (Array.isArray(submission.answers)) {
      submission.answers.forEach(a => {
        const key = a.title || a.id
        answersMap[key] = a.value
      })
    }

    const payload = {
      id: submission.id,
      formId: form.id,
      formName: form.name,
      submittedAt: new Date().toISOString(),
      answers: answersMap,
      rawAnswers: submission.answers,
      hiddenFields: submission.hiddenFields,
      variables: submission.variables
    }

    try {
      const res = await got.post(url.toString(), {
        lookup,
        json: payload,
        responseType: 'json',
        timeout: 15000,
        retry: 1
      })

      return {
        endpointUrl: config.webhookUrl,
        requestMethod: 'POST',
        requestPayload: payload,
        responseBody: res?.body
      }
    } catch (err: any) {
      err.diagnosticUrl = config.webhookUrl
      err.diagnosticMethod = 'POST'
      err.diagnosticPayload = payload
      throw err
    }
  }
}
