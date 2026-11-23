import { SmtpOptionsFactory } from '@config'
import { SMTP_FROM } from '@environments'
import { answersToHtml } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'
import { FormModel, SubmissionModel } from '@model'
import { smtpSendMail } from '@utils'

export interface EmailConfig {
  emails: string
  subject?: string
}

interface RunArgs {
  config: EmailConfig
  submission: SubmissionModel
  form: FormModel
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  id: 'email',
  name: 'Email Notification',
  description:
    'Send custom email notifications with form submission details directly to your team or respondents.',
  icon: '/static/email.png',
  settings: [
    {
      type: 'text',
      name: 'emails',
      label: 'Recipient Emails',
      placeholder: 'e.g. team@example.com, manager@example.com',
      required: true,
      description: 'Comma-separated list of email addresses to receive submission notifications'
    },
    {
      type: 'text',
      name: 'subject',
      label: 'Email Subject',
      placeholder: 'New form submission received',
      required: false,
      description: 'Optional custom subject line for notification emails'
    }
  ],
  run: async ({ config, submission, form }: RunArgs) => {
    if (!config?.emails) {
      return { skipped: true, reason: 'No recipient email addresses configured' }
    }

    const recipients = Array.from(
      new Set(
        config.emails
          .split(',')
          .map(e => e.trim())
          .filter(e => helper.isEmail(e))
      )
    )

    if (recipients.length === 0) {
      return { skipped: true, reason: 'No valid recipient email addresses configured' }
    }

    const rawSubject = config.subject || `New submission for ${form.name || 'Untitled Form'}`
    const subject = rawSubject.replace(/[\r\n]+/g, ' ').trim()
    const htmlAnswers = answersToHtml(submission.answers || [])
    const safeFormName = escapeHtml(form.name || 'Untitled Form')
    const safeSubmissionId = escapeHtml(submission.id)

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 8px; font-size: 20px;">New Submission for ${safeFormName}</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 0; margin-bottom: 20px;">Submission ID: ${safeSubmissionId}</p>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 14px; line-height: 1.6;">
          ${htmlAnswers}
        </div>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          Sent automatically via KyndForm
        </div>
      </div>
    `

    const smtpOptions = SmtpOptionsFactory()
    const messageId = await smtpSendMail(smtpOptions, {
      from: SMTP_FROM,
      to: recipients.join(', '),
      subject,
      html: htmlBody
    })

    return {
      endpointUrl: `smtp://${smtpOptions.host}:${smtpOptions.port}`,
      requestMethod: 'SMTP',
      requestPayload: {
        to: recipients,
        subject
      },
      responseStatus: 250,
      responseBody: {
        messageId
      }
    }
  }
}
