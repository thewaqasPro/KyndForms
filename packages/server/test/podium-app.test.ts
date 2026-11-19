import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

import podium, { buildPodiumContactPayload } from '../src/apps/podium'

function testPodiumAppDefinition() {
  assert.strictEqual(podium.id, 'podium')
  assert.strictEqual(podium.name, 'Podium')
  assert.strictEqual(podium.icon, '/static/podium.svg')
  assert.ok(podium.description.includes('Podium'))
  assert.strictEqual(podium.settings.length, 6)

  const tokenSetting = podium.settings[0]
  assert.strictEqual(tokenSetting.name, 'apiToken')
  assert.strictEqual(tokenSetting.required, true)

  const locationSetting = podium.settings[1]
  assert.strictEqual(locationSetting.name, 'locationUid')
  assert.strictEqual(locationSetting.required, true)

  const tagSetting = podium.settings[2]
  assert.strictEqual(tagSetting.name, 'customTag')
  assert.strictEqual(tagSetting.required, false)

  const refreshSetting = podium.settings[3]
  assert.strictEqual(refreshSetting.name, 'refreshToken')
  assert.strictEqual(refreshSetting.required, false)
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
        value: 'Vintage Halo'
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

  // Verify UUID tags are passed
  const uuidConfig = {
    ...config,
    customTag: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f'
  }
  const payloadWithTag = buildPodiumContactPayload(uuidConfig, mockSubmission, mockForm)
  assert.deepStrictEqual(payloadWithTag?.tags, ['b3f27f05-992a-4bc4-9d41-0b5cbe83072f'])
}

function testFallbackNameWhenMissing() {
  const mockSubmission = {
    answers: [
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
  assert.strictEqual(payload.name, 'John.doe')
  assert.strictEqual(payload.email, 'john.doe@example.com')
}

async function run() {
  testPodiumAppDefinition()
  testPodiumPayloadBuilder()
  testFallbackNameWhenMissing()
  console.log('podium-app tests passed!')
}

if (require.main === module) {
  run().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
