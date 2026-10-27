import { EndScreenButton } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

import { UpdateFormSchemasResolver } from '../src/resolver/form/update-form-schemas.resolver'

function createResolver(initialFormVersion = 1) {
  let savedUpdates: Record<string, any> | undefined

  const formService = {
    findById: async (formId: string) => ({
      id: formId,
      version: initialFormVersion
    }),
    update: async (formId: string, updates: Record<string, any>) => {
      savedUpdates = updates
      return true
    }
  }

  return {
    resolver: new UpdateFormSchemasResolver(formService as any),
    getSavedUpdates: () => savedUpdates
  }
}

async function testAllowsUpdatingDraftsWithEndScreenButtons() {
  const { resolver, getSavedUpdates } = createResolver(1)

  const buttons: EndScreenButton[] = [
    {
      id: 'btn_123',
      text: 'Learn More',
      label: 'Learn More',
      action: 'url',
      url: 'https://example.com',
      newTab: true,
      variant: 'primary'
    },
    {
      id: 'btn_456',
      text: 'Restart',
      label: 'Restart',
      action: 'reload',
      variant: 'secondary'
    }
  ]

  const result = await resolver.updateFormSchemas({
    formId: 'form_123',
    version: 1,
    drafts: [
      {
        id: 'thank_you_field',
        kind: 'thank_you' as any,
        title: 'Thank you for your response',
        properties: {
          screenVariant: 'rich',
          align: 'center',
          buttons
        }
      }
    ]
  })

  assert.strictEqual(result.version, 2)
  assert.strictEqual(result.canPublish, true)
  assert.strictEqual(result.drafts.length, 1)

  const thankYouField = result.drafts[0]
  assert.strictEqual(thankYouField.properties?.buttons?.length, 2)
  assert.strictEqual(thankYouField.properties?.buttons?.[0].label, 'Learn More')
  assert.strictEqual(thankYouField.properties?.buttons?.[0].text, 'Learn More')
  assert.strictEqual(thankYouField.properties?.buttons?.[1].action, 'reload')

  const savedUpdates = getSavedUpdates()
  assert(savedUpdates?._drafts, 'Should save serialized _drafts')
  const parsedDrafts = JSON.parse(savedUpdates._drafts)
  assert.strictEqual(parsedDrafts[0].properties.buttons.length, 2)
  assert.strictEqual(parsedDrafts[0].properties.buttons[0].id, 'btn_123')
}

async function testRejectsStaleVersion() {
  const { resolver } = createResolver(5)

  await assert.rejects(
    resolver.updateFormSchemas({
      formId: 'form_123',
      version: 4, // stale version
      drafts: []
    }),
    /The version provided is not valid/
  )
}

async function run() {
  await testAllowsUpdatingDraftsWithEndScreenButtons()
  await testRejectsStaleVersion()
}

if (require.main === module) {
  run().catch(error => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
}
