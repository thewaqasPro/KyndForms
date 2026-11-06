import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'
import got from 'got'

import klaviyo, { buildKlaviyoPayload } from '../src/apps/klaviyo'

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
      }
    ]
  }

  const payload = buildKlaviyoPayload(config, submission)
  assert.ok(payload)
  assert.strictEqual(payload.data.type, 'profile-subscription-bulk-create-job')
  assert.strictEqual(payload.data.relationships.list.data.id, 'LIST123')

  const profile = payload.data.attributes.profiles.data[0]
  assert.strictEqual(profile.attributes.email, 'test.user@example.com')
  assert.strictEqual(profile.attributes.first_name, 'Jane')
  assert.strictEqual(profile.attributes.last_name, 'Doe')
  assert.strictEqual(profile.attributes.phone_number, '+15551234567')
  assert.strictEqual(profile.attributes.properties['Company Name'], 'Acme Corp')
  assert.deepStrictEqual(profile.attributes.properties['Interests'], [
    'Newsletter',
    'Product Updates'
  ])
  assert.strictEqual(profile.attributes.subscriptions?.email?.marketing?.consent, 'SUBSCRIBED')
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

  const payload = buildKlaviyoPayload(config, submission)
  assert.strictEqual(payload, null)
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

  const payload = buildKlaviyoPayload(config, submission)
  assert.ok(payload)
  assert.strictEqual(
    payload.data.attributes.profiles.data[0].attributes.email,
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
  let capturedUrl = ''
  let capturedOptions: any = null

  try {
    ;(got as any).post = async (url: string, options: any) => {
      capturedUrl = url
      capturedOptions = options
      return { statusCode: 202, body: {} }
    }

    await klaviyo.run({
      config,
      submission,
      form: { id: 'form_123' } as any
    })

    assert.strictEqual(
      capturedUrl,
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/'
    )
    assert.strictEqual(
      capturedOptions.headers['Authorization'],
      'Klaviyo-API-Key pk_live_abcdef123456'
    )
    assert.strictEqual(capturedOptions.headers['revision'], '2024-02-15')
    assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/vnd.api+json')
    assert.strictEqual(capturedOptions.headers['Accept'], 'application/vnd.api+json')
    assert.ok(capturedOptions.json)
    assert.strictEqual(
      capturedOptions.json.data.attributes.profiles.data[0].attributes.email,
      'campaign.lead@example.com'
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
