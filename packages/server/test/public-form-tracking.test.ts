import * as assert from 'assert'

import { PublicFormResolver } from '../src/resolver/form/form-detail.resolver'

async function testPublicFormResolvesAnalyticsIntegrations() {
  const mockForm = {
    id: 'form_123',
    teamId: 'team_123',
    projectId: 'proj_123',
    name: 'Feedback Form',
    settings: {
      active: true
    }
  }

  const mockIntegrations = [
    {
      appId: 'facebook-pixel',
      config: { pixelId: '751374180786271' }
    },
    {
      appId: 'google-analytics',
      config: { measurementId: 'G-ABC123XYZ' }
    }
  ]

  const formService = {
    findPublicForm: async (formId: string) => (formId === 'form_123' ? mockForm : null)
  }

  const integrationService = {
    findAllInFormByApps: async (formId: string, appIds: string[]) => {
      assert.strictEqual(formId, 'form_123')
      assert.deepStrictEqual(appIds.sort(), ['facebook-pixel', 'google-analytics'].sort())
      return mockIntegrations
    }
  }

  const resolver = new PublicFormResolver(formService as any, integrationService as any)
  const result = await resolver.publicForm({ formId: 'form_123' } as any)

  assert.ok(result.integrations)
  assert.strictEqual(result.integrations['facebook-pixel']?.pixelId, '751374180786271')
  assert.strictEqual(result.integrations['google-analytics']?.measurementId, 'G-ABC123XYZ')
}

async function run() {
  await testPublicFormResolvesAnalyticsIntegrations()
  console.log('public-form-tracking test passed!')
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
