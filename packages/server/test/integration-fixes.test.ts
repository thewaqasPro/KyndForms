import * as assert from 'assert'
import * as nodemailer from 'nodemailer'

import { AppService } from '../src/service/app.service'
import { smtpSendMail } from '../src/utils/smtp'

import emailApp from '../src/apps/email'

const bufferMod = require('buffer')
if (!bufferMod.SlowBuffer) {
  bufferMod.SlowBuffer = Buffer
}
if (typeof (global as any).SlowBuffer === 'undefined') {
  ;(global as any).SlowBuffer = Buffer
}

function testAppServiceLookupByKebabCaseId() {
  const appService = new AppService()

  assert.strictEqual(appService.findById('google-sheets')?.id, 'google-sheets')
  assert.strictEqual(appService.findById('google-drive')?.id, 'google-drive')
  assert.strictEqual(appService.findById('lark-suite')?.id, 'lark-suite')
  assert.strictEqual(appService.findById('facebook-pixel')?.id, 'facebook-pixel')
  assert.strictEqual(appService.findById('google-analytics')?.id, 'google-analytics')
  assert.strictEqual(appService.findById('podium')?.id, 'podium')
  assert.strictEqual(appService.findById('klaviyo')?.id, 'klaviyo')
  assert.strictEqual(appService.findById('email')?.id, 'email')
  assert.strictEqual(appService.findById('non-existent'), undefined)
}

async function testSmtpTlsRejectUnauthorizedLogic() {
  const originalCreateTransport = nodemailer.createTransport
  const capturedConfigs: any[] = []

  try {
    ;(nodemailer as any).createTransport = (config: any) => {
      capturedConfigs.push(config)
      return {
        sendMail: async () => ({ messageId: 'msg_123' })
      }
    }

    // Default (ignoreCert: false) should verify certificates (rejectUnauthorized: true)
    await smtpSendMail(
      {
        host: 'smtp-verify.test',
        port: 587,
        user: 'u1@example.com',
        password: 'p',
        secure: false,
        ignoreCert: false
      },
      { from: 'a@example.com', to: 'b@example.com', subject: 'hi', html: '<p>hi</p>' }
    )
    assert.strictEqual(capturedConfigs[0].tls.rejectUnauthorized, true)

    // ignoreCert: true should disable verification (rejectUnauthorized: false)
    await smtpSendMail(
      {
        host: 'smtp-ignore.test',
        port: 587,
        user: 'u2@example.com',
        password: 'p',
        secure: false,
        ignoreCert: true
      },
      { from: 'a@example.com', to: 'b@example.com', subject: 'hi', html: '<p>hi</p>' }
    )
    assert.strictEqual(capturedConfigs[1].tls.rejectUnauthorized, false)
  } finally {
    ;(nodemailer as any).createTransport = originalCreateTransport
  }
}

async function testEmailAppSanitizationAndValidation() {
  // Invalid emails return skipped
  const skippedRes: any = await emailApp.run({
    config: { emails: 'not-an-email, also-bad' },
    submission: { id: 'sub_1', answers: [] } as any,
    form: { name: 'Contact' } as any
  })
  assert.strictEqual(skippedRes?.skipped, true)

  const originalCreateTransport = nodemailer.createTransport
  const sentMessages: any[] = []

  try {
    ;(nodemailer as any).createTransport = () => ({
      sendMail: async (msg: any) => {
        sentMessages.push(msg)
        return { messageId: 'msg_email_1' }
      }
    })

    const res: any = await emailApp.run({
      config: {
        emails: 'valid1@example.com, bad-email, valid2@example.com, valid1@example.com',
        subject: 'Hello\r\nBcc: attacker@evil.com'
      },
      submission: { id: 'sub_<script>', answers: [] } as any,
      form: { name: '<img src=x onerror=alert(1)>' } as any
    })

    assert.strictEqual(sentMessages.length, 1)
    assert.strictEqual(sentMessages[0].to, 'valid1@example.com, valid2@example.com')
    assert.ok(!sentMessages[0].subject.includes('\r') && !sentMessages[0].subject.includes('\n'))
    assert.ok(sentMessages[0].html.includes('&lt;img src=x onerror=alert(1)&gt;'))
    assert.ok(sentMessages[0].html.includes('sub_&lt;script&gt;'))
    assert.strictEqual(res.responseStatus, 250)
    assert.strictEqual(res.requestMethod, 'SMTP')
    assert.deepStrictEqual(res.requestPayload.to, ['valid1@example.com', 'valid2@example.com'])
  } finally {
    ;(nodemailer as any).createTransport = originalCreateTransport
  }
}

async function run() {
  testAppServiceLookupByKebabCaseId()
  await testSmtpTlsRejectUnauthorizedLogic()
  await testEmailAppSanitizationAndValidation()
  console.log('All integration-fixes tests passed!')
}

if (require.main === module) {
  run().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
