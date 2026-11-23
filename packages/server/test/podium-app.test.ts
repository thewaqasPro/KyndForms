import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'
import got from 'got'

import podium, { buildPodiumContactPayload } from '../src/apps/podium'

function testPodiumAppDefinition() {
  assert.strictEqual(podium.id, 'podium')
  assert.strictEqual(podium.name, 'Podium')
  assert.strictEqual(podium.icon, '/static/podium.svg')
  assert.ok(podium.description.includes('Podium'))
  assert.strictEqual(podium.settings.length, 7)

  const tokenSetting = podium.settings[0]
  assert.strictEqual(tokenSetting.name, 'apiToken')
  assert.strictEqual(tokenSetting.required, true)

  const locationSetting = podium.settings[1]
  assert.strictEqual(locationSetting.name, 'locationUid')
  assert.strictEqual(locationSetting.required, true)

  const defaultLeadNameSetting = podium.settings.find(s => s.name === 'defaultLeadName')
  assert.ok(defaultLeadNameSetting)
  assert.strictEqual(defaultLeadNameSetting?.required, false)

  const tagSetting = podium.settings.find(s => s.name === 'customTag')
  assert.ok(tagSetting)
  assert.strictEqual(tagSetting?.required, false)

  const refreshSetting = podium.settings.find(s => s.name === 'refreshToken')
  assert.ok(refreshSetting)
  assert.strictEqual(refreshSetting?.required, false)
}

function testPodiumPayloadBuilder() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.FULL_NAME,
        title: 'Your Name',
        value: {
          firstName: 'Alice',
          lastName: 'Smith'
        }
      },
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Your Email',
        value: 'alice@example.com'
      },
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title: 'Phone',
        value: '5551234567'
      },
      {
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Style Preference*',
        value: 'Vintage Halo',
        uid: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072a'
      }
    ]
  } as any

  const mockForm = {
    name: 'Find Your Dream Ring'
  } as any

  const config = {
    apiToken: 'test_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
    customTag: 'KyndFrom Diamond Quiz'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, mockForm)
  assert.ok(payload)
  assert.strictEqual(payload.name, 'Alice Smith')
  assert.strictEqual(payload.email, 'alice@example.com')
  assert.strictEqual(payload.phoneNumber, '+15551234567')
  assert.deepStrictEqual(payload.locations, ['0f732703-b9a1-5dc4-a05d-387669bdc574'])
  assert.strictEqual(payload.contactStatus?.name, 'New Lead')
  assert.ok(Array.isArray(payload.attributes) && payload.attributes.length > 0)
  assert.ok(
    payload.attributes.some(
      a => a.uid === 'b3f27f05-992a-4bc4-9d41-0b5cbe83072a' && a.value === 'Vintage Halo'
    )
  )

  // Verify UUID tags are passed
  const uuidConfig = {
    ...config,
    customTag: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f'
  }
  const payloadWithTag = buildPodiumContactPayload(uuidConfig, mockSubmission, mockForm)
  assert.deepStrictEqual(payloadWithTag?.tags, ['b3f27f05-992a-4bc4-9d41-0b5cbe83072f'])
}

function testUnmappedAttributesOmittedFromPayload() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title:
          'Just enter your phone number and we’ll send you a Diamond Gift Card for up to $2000* off!',
        value: '+17785945459'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {} as any)
  assert.ok(payload)
  assert.strictEqual(payload.phoneNumber, '+17785945459')
  // Attributes without a Podium custom attribute UUID must NOT be sent to avoid 400 Bad Request
  assert.strictEqual(payload.attributes, undefined)
}

function testFirstNameFromIntroQuestion() {
  const mockSubmission = {
    answers: [
      {
        kind: 'short_text',
        title: 'Find The Perfect Engagement Ring For Your Style*',
        value: 'Gary'
      },
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Email Address',
        value: 'rubeljeweler@gmail.com'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {} as any)
  assert.ok(payload)
  assert.strictEqual(payload.name, 'Gary')
  assert.strictEqual(payload.email, 'rubeljeweler@gmail.com')
}

function testCustomDefaultLeadName() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title: 'Phone',
        value: '+17785945459'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
    defaultLeadName: 'Diamond Quiz Lead'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {
    name: 'Find Your Ring'
  } as any)
  assert.ok(payload)
  assert.strictEqual(payload.name, 'Diamond Quiz Lead')
}

function testFormNameFallbackWhenDefaultLeadNameOmitted() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title: 'Phone',
        value: '+17785945459'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {
    name: 'Find Your Ring'
  } as any)
  assert.ok(payload)
  assert.strictEqual(payload.name, 'Find Your Ring Lead')
}

function testMultipleTagUidsParsing() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Email',
        value: 'lead@example.com'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
    customTag: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f, c4d92102-1234-5678-9abc-def012345678'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {} as any)
  assert.ok(payload)
  assert.deepStrictEqual(payload.tags, [
    'b3f27f05-992a-4bc4-9d41-0b5cbe83072f',
    'c4d92102-1234-5678-9abc-def012345678'
  ])
}

function testCustomAttributeMapping() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Email',
        value: 'lead@example.com'
      },
      {
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Style Preference*',
        value: 'Vintage Halo'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
    attributeMappings: {
      'Style Preference': 'c7b5a830-6712-4217-91a3-2c1b48e23f11'
    }
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {} as any)
  assert.ok(payload)
  assert.ok(Array.isArray(payload.attributes) && payload.attributes.length === 1)
  assert.strictEqual(payload.attributes[0].uid, 'c7b5a830-6712-4217-91a3-2c1b48e23f11')
  assert.strictEqual(payload.attributes[0].value, 'Vintage Halo')
}

function testFallbackNameWhenMissing() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.SHORT_TEXT,
        title: 'Company Size',
        value: 'Enterprise'
      },
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Email Address',
        value: 'john.doe@example.com'
      }
    ]
  } as any

  const mockForm = { name: 'Contact Form' } as any
  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, mockForm)
  assert.ok(payload)
  // Should NOT mistakenly treat 'Enterprise' as contact name; falls back to email username
  assert.strictEqual(payload.name, 'John.doe')
  assert.strictEqual(payload.email, 'john.doe@example.com')
}

function testInternationalPhoneNotForcedToUS() {
  const mockSubmission = {
    answers: [
      {
        kind: FieldKindEnum.EMAIL,
        title: 'Email',
        value: 'uk.lead@example.co.uk'
      },
      {
        kind: FieldKindEnum.PHONE_NUMBER,
        title: 'Phone',
        value: '447911123456'
      }
    ]
  } as any

  const config = {
    apiToken: 'test_token',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const payload = buildPodiumContactPayload(config, mockSubmission, {} as any)
  assert.ok(payload)
  assert.strictEqual(payload.phoneNumber, '+447911123456')
}

async function testSkippedAndNoDuplicateTaggingAndRefreshCallback() {
  const originalPost = got.post
  const calls: Array<{ url: string; options: any }> = []

  try {
    // 1. Missing email/phone returns skipped
    const skippedRes: any = await podium.run({
      config: {
        apiToken: 'test_token',
        locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
      },
      submission: {
        answers: [{ kind: FieldKindEnum.SHORT_TEXT, title: 'Note', value: 'Hi' }]
      } as any,
      form: { id: 'form_1' } as any
    })
    assert.strictEqual(skippedRes?.skipped, true)

    // 2. Valid UUID tag applied on create should NOT trigger a second tag POST
    ;(got as any).post = async (url: string, options: any) => {
      calls.push({ url, options })
      return { statusCode: 201, body: { data: { uid: 'contact_123' } } }
    }

    await podium.run({
      config: {
        apiToken: 'test_token',
        locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
        customTag: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f'
      },
      submission: {
        answers: [{ kind: FieldKindEnum.EMAIL, title: 'Email', value: 'lead@example.com' }]
      } as any,
      form: { id: 'form_1' } as any
    })
    assert.strictEqual(calls.length, 1)

    // 3. OAuth 401 refresh invokes onConfigUpdate callback
    calls.length = 0
    let persistedUpdates: Record<string, any> | null = null
    let attempt = 0
    ;(got as any).post = async (url: string, options: any) => {
      calls.push({ url, options })
      if (url.includes('/oauth/token')) {
        return {
          statusCode: 200,
          body: { access_token: 'fresh_token', refresh_token: 'fresh_refresh' }
        }
      }
      attempt += 1
      if (attempt === 1) {
        const err: any = new Error('Unauthorized')
        err.response = { statusCode: 401 }
        throw err
      }
      return { statusCode: 201, body: { data: { uid: 'contact_123' } } }
    }

    await podium.run({
      config: {
        apiToken: 'expired_token',
        locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
        refreshToken: 'old_refresh',
        clientId: 'cid',
        clientSecret: 'csec'
      },
      submission: {
        answers: [{ kind: FieldKindEnum.EMAIL, title: 'Email', value: 'lead@example.com' }]
      } as any,
      form: { id: 'form_1' } as any,
      onConfigUpdate: async updates => {
        persistedUpdates = updates
      }
    })
    assert.deepStrictEqual(persistedUpdates, {
      apiToken: 'fresh_token',
      refreshToken: 'fresh_refresh'
    })
  } finally {
    ;(got as any).post = originalPost
  }
}

async function run() {
  testPodiumAppDefinition()
  testPodiumPayloadBuilder()
  testUnmappedAttributesOmittedFromPayload()
  testFirstNameFromIntroQuestion()
  testCustomDefaultLeadName()
  testFormNameFallbackWhenDefaultLeadNameOmitted()
  testMultipleTagUidsParsing()
  testCustomAttributeMapping()
  testFallbackNameWhenMissing()
  testInternationalPhoneNotForcedToUS()
  await testSkippedAndNoDuplicateTaggingAndRefreshCallback()
  console.log('podium-app tests passed!')
}

if (require.main === module) {
  run().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
