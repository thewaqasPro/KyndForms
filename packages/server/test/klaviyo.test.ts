import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'
import got from 'got'

import klaviyo, * as klaviyoApp from '../src/apps/klaviyo'

function testAppDefinition() {
  assert.strictEqual(klaviyo.id, 'klaviyo')
  assert.strictEqual(klaviyo.name, 'Klaviyo')
  assert.strictEqual(typeof klaviyo.run, 'function')
  assert.ok(klaviyo.icon)

  const settingNames = klaviyo.settings.map(s => s.name)
  assert.ok(settingNames.includes('apiKey'))
  assert.ok(settingNames.includes('listId'))
}

function testBuildPayloadWithCompleteSubmission() {
  const config = {
    apiKey: 'pk_test_1234567890',
    listId: 'LIST123'
  }

  const submission: any = {
    answers: [
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Work Email',
        value: 'Test.User@example.com'
      },
      {
        kind: FieldKindEnum.FULL_NAME,
        title: 'Your Name',
        value: {
          firstName: 'Jane',
          lastName: 'Doe'
        }
      },
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title: 'Mobile',
        value: '+15551234567'
      },
      {
        kind: FieldKindEnum.SHORT_TEXT,
        title: 'Company Name',
        value: 'Acme Corp'
      },
      {
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Interests',
        value: ['Newsletter', 'Product Updates']
      },
      {
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Which of these best describes your style?*',
        properties: {
          choices: [
            { id: 'ZRZ4iVxriuWS', label: 'Classic' },
            { id: 'toVYm6hYNWZA', label: 'Modern' }
          ]
        },
        value: { value: ['ZRZ4iVxriuWS'] }
      }
    ]
  }

  // 1. Profile upsert payload
  const profilePayload = klaviyoApp.buildKlaviyoProfilePayload(submission)
  assert.ok(profilePayload)
  assert.strictEqual(profilePayload.data.type, 'profile')
  assert.strictEqual(profilePayload.data.attributes.email, 'test.user@example.com')
  assert.strictEqual(profilePayload.data.attributes.first_name, 'Jane')
  assert.strictEqual(profilePayload.data.attributes.last_name, 'Doe')
  assert.strictEqual(profilePayload.data.attributes.phone_number, '+15551234567')
  assert.strictEqual(profilePayload.data.attributes.properties?.['Company Name'], 'Acme Corp')
  assert.strictEqual(
    profilePayload.data.attributes.properties?.['Interests'],
    'Newsletter, Product Updates'
  )
  // Verify clean question key without asterisk resolves to human-readable label
  assert.strictEqual(
    profilePayload.data.attributes.properties?.['Which of these best describes your style?'],
    'Classic'
  )
  // Also backward-compatible with raw asterisk key
  assert.strictEqual(
    profilePayload.data.attributes.properties?.['Which of these best describes your style?*'],
    'Classic'
  )

  // 2. Subscribe payload
  const subscribePayload = klaviyoApp.buildKlaviyoSubscribePayload(config, submission)
  assert.ok(subscribePayload)
  assert.strictEqual(subscribePayload.data.type, 'profile-subscription-bulk-create-job')
  assert.strictEqual(subscribePayload.data.relationships.list.data.id, 'LIST123')

  const profile = subscribePayload.data.attributes.profiles.data[0]
  assert.strictEqual(profile.attributes.email, 'test.user@example.com')
  assert.strictEqual(profile.attributes.subscriptions?.email?.marketing?.consent, 'SUBSCRIBED')
  // Verify strict compliance: no first_name or properties on subscription payload
  assert.strictEqual((profile.attributes as any).first_name, undefined)
  assert.strictEqual((profile.attributes as any).properties, undefined)
}

function testBuildPayloadWithoutEmailReturnsNull() {
  const config = {
    apiKey: 'pk_test_1234567890',
    listId: 'LIST123'
  }

  const submission: any = {
    answers: [
      {
        kind: FieldKindEnum.SHORT_TEXT,
        title: 'Feedback',
        value: 'Great form!'
      }
    ]
  }

  assert.strictEqual(klaviyoApp.buildKlaviyoProfilePayload(submission), null)
  assert.strictEqual(klaviyoApp.buildKlaviyoSubscribePayload(config, submission), null)
}

function testBuildPayloadWithCustomEmailFieldTitle() {
  const config = {
    apiKey: 'pk_test_1234567890',
    listId: 'LIST123'
  }

  const submission: any = {
    answers: [
      {
        kind: FieldKindEnum.SHORT_TEXT,
        title: 'Contact Email Address',
        value: 'respondent@example.org'
      }
    ]
  }

  const profilePayload = klaviyoApp.buildKlaviyoProfilePayload(submission)
  assert.ok(profilePayload)
  assert.strictEqual(profilePayload.data.attributes.email, 'respondent@example.org')

  const subscribePayload = klaviyoApp.buildKlaviyoSubscribePayload(config, submission)
  assert.ok(subscribePayload)
  assert.strictEqual(
    subscribePayload.data.attributes.profiles.data[0].attributes.email,
    'respondent@example.org'
  )
}

async function testKlaviyoRunDispatchesNetworkRequest() {
  const config = {
    apiKey: 'pk_live_abcdef123456',
    listId: 'LIST_XYZ'
  }

  const submission: any = {
    answers: [
      {
        kind: FieldKindEnum.EMAIL,
        value: 'campaign.lead@example.com'
      },
      {
        kind: FieldKindEnum.FULL_NAME,
        value: { firstName: 'Alex', lastName: 'Smith' }
      }
    ]
  }

  const originalPost = got.post
  const calls: Array<{ url: string; options: any }> = []

  try {
    ;(got as any).post = async (url: string, options: any) => {
      calls.push({ url, options })
      return { statusCode: 200, body: {} }
    }

    await klaviyo.run({
      config,
      submission,
      form: { id: 'form_123' } as any
    })

    assert.strictEqual(calls.length, 2)

    // Call 1: Profile Upsert
    assert.strictEqual(calls[0].url, 'https://a.klaviyo.com/api/profile-import/')
    assert.strictEqual(
      calls[0].options.headers['Authorization'],
      'Klaviyo-API-Key pk_live_abcdef123456'
    )
    assert.strictEqual(calls[0].options.headers['revision'], '2024-02-15')
    assert.strictEqual(calls[0].options.json.data.type, 'profile')
    assert.strictEqual(calls[0].options.json.data.attributes.email, 'campaign.lead@example.com')
    assert.strictEqual(calls[0].options.json.data.attributes.first_name, 'Alex')
    assert.strictEqual(calls[0].options.json.data.attributes.last_name, 'Smith')

    // Call 2: Subscribe to List
    assert.strictEqual(
      calls[1].url,
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/'
    )
    assert.strictEqual(
      calls[1].options.headers['Authorization'],
      'Klaviyo-API-Key pk_live_abcdef123456'
    )
    assert.strictEqual(calls[1].options.headers['revision'], '2024-02-15')
    assert.strictEqual(calls[1].options.json.data.type, 'profile-subscription-bulk-create-job')
    assert.strictEqual(calls[1].options.json.data.relationships.list.data.id, 'LIST_XYZ')
    assert.strictEqual(
      calls[1].options.json.data.attributes.profiles.data[0].attributes.email,
      'campaign.lead@example.com'
    )
    assert.strictEqual(
      calls[1].options.json.data.attributes.profiles.data[0].attributes.subscriptions.email
        .marketing.consent,
      'SUBSCRIBED'
    )
  } finally {
    ;(got as any).post = originalPost
  }
}

async function run() {
  testAppDefinition()
  testBuildPayloadWithCompleteSubmission()
  testBuildPayloadWithoutEmailReturnsNull()
  testBuildPayloadWithCustomEmailFieldTitle()
  await testKlaviyoRunDispatchesNetworkRequest()
}

if (require.main === module) {
  run()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('All Klaviyo tests passed successfully')
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(err)
      process.exitCode = 1
    })
}
