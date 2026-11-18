import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

import podium, { buildPodiumContactPayload } from '../src/apps/podium'

function testPodiumAppDefinition() {
  assert.strictEqual(podium.id, 'podium')
  assert.strictEqual(podium.name, 'Podium')
  assert.strictEqual(podium.icon, '/static/podium.svg')
  assert.ok(podium.description.includes('Podium'))
  assert.strictEqual(podium.settings.length, 3)

  const tokenSetting = podium.settings[0]
  assert.strictEqual(tokenSetting.name, 'apiToken')
  assert.strictEqual(tokenSetting.required, true)

  const locationSetting = podium.settings[1]
  assert.strictEqual(locationSetting.name, 'locationUid')
  assert.strictEqual(locationSetting.required, true)

  const tagSetting = podium.settings[2]
  assert.strictEqual(tagSetting.name, 'customTag')
  assert.strictEqual(tagSetting.required, false)
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
  assert.ok(payload.tags?.includes('Website Lead'))
  assert.ok(payload.tags?.includes('KyndFrom Diamond Quiz'))
  assert.ok(payload.tags?.includes('Find Your Dream Ring'))
  assert.strictEqual(payload.contactStatus?.name, 'New Lead')

  // Check attributes
  const styleAttr = payload.attributes?.find(a => a.name === 'Style Preference')
  assert.ok(styleAttr)
  assert.strictEqual(styleAttr.value, 'Vintage Halo')
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
