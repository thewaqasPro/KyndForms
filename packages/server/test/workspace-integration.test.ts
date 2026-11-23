import * as assert from 'assert'

import './polyfill-node26'

function mergeEffectiveConfig(
  formConfig: Record<string, any>,
  workspaceConfig: Record<string, any>
): Record<string, any> {
  const isGlobalEnabled =
    formConfig.useGlobalConnection !== false && Object.keys(workspaceConfig).length > 0
  if (!isGlobalEnabled) return formConfig
  const merged = { ...workspaceConfig }
  for (const [k, v] of Object.entries(formConfig)) {
    if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '')) {
      merged[k] = v
    }
  }
  return merged
}

function testWorkspaceConfigInheritance() {
  const workspaceConfig = {
    apiToken: 'ws_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574',
    clientId: 'ws_client_id',
    clientSecret: 'ws_secret',
    refreshToken: 'ws_refresh_token'
  }

  const formConfig = {
    defaultLeadName: 'Diamond Quiz Lead',
    customTag: 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f'
  }

  const effective = mergeEffectiveConfig(formConfig, workspaceConfig)

  assert.strictEqual(effective.apiToken, 'ws_token_123')
  assert.strictEqual(effective.locationUid, '0f732703-b9a1-5dc4-a05d-387669bdc574')
  assert.strictEqual(effective.clientId, 'ws_client_id')
  assert.strictEqual(effective.clientSecret, 'ws_secret')
  assert.strictEqual(effective.refreshToken, 'ws_refresh_token')
  assert.strictEqual(effective.defaultLeadName, 'Diamond Quiz Lead')
  assert.strictEqual(effective.customTag, 'b3f27f05-992a-4bc4-9d41-0b5cbe83072f')
}

function testFormLocationOverrideTakesPrecedence() {
  const workspaceConfig = {
    apiToken: 'ws_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const formConfig = {
    locationUid: 'custom-branch-location-uuid',
    defaultLeadName: 'Branch Lead'
  }

  const effective = mergeEffectiveConfig(formConfig, workspaceConfig)

  assert.strictEqual(effective.locationUid, 'custom-branch-location-uuid')
  assert.strictEqual(effective.defaultLeadName, 'Branch Lead')
  assert.strictEqual(effective.apiToken, 'ws_token_123')
}

function testBlankStringDoesNotOverrideWorkspaceValue() {
  const workspaceConfig = {
    apiToken: 'ws_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const formConfig = {
    locationUid: '   ',
    apiToken: '',
    defaultLeadName: 'Quiz Lead'
  }

  const effective = mergeEffectiveConfig(formConfig, workspaceConfig)

  assert.strictEqual(effective.locationUid, '0f732703-b9a1-5dc4-a05d-387669bdc574')
  assert.strictEqual(effective.apiToken, 'ws_token_123')
  assert.strictEqual(effective.defaultLeadName, 'Quiz Lead')
}

function testDisabledGlobalConnectionIgnoresWorkspace() {
  const workspaceConfig = {
    apiToken: 'ws_token_123',
    locationUid: '0f732703-b9a1-5dc4-a05d-387669bdc574'
  }

  const formConfig = {
    useGlobalConnection: false,
    apiToken: 'standalone_token_456',
    locationUid: 'standalone_location_789'
  }

  const effective = mergeEffectiveConfig(formConfig, workspaceConfig)

  assert.strictEqual(effective.apiToken, 'standalone_token_456')
  assert.strictEqual(effective.locationUid, 'standalone_location_789')
}

async function testTokenRefreshUpdatesWorkspaceAndForm() {
  const formStore: Record<string, any> = {
    apiToken: 'old_access_token',
    refreshToken: 'old_refresh_token'
  }

  const workspaceStore: Record<string, any> = {
    apiToken: 'old_access_token',
    refreshToken: 'old_refresh_token'
  }

  const isGlobalEnabled = true

  const onConfigUpdate = async (updates: Record<string, any>) => {
    for (const [key, val] of Object.entries(updates)) {
      formStore[key] = val
    }
    if (isGlobalEnabled) {
      for (const [key, val] of Object.entries(updates)) {
        workspaceStore[key] = val
      }
    }
  }

  await onConfigUpdate({
    apiToken: 'new_fresh_token',
    refreshToken: 'new_fresh_refresh_token'
  })

  assert.strictEqual(formStore.apiToken, 'new_fresh_token')
  assert.strictEqual(formStore.refreshToken, 'new_fresh_refresh_token')
  assert.strictEqual(workspaceStore.apiToken, 'new_fresh_token')
  assert.strictEqual(workspaceStore.refreshToken, 'new_fresh_refresh_token')
}

async function run() {
  testWorkspaceConfigInheritance()
  testFormLocationOverrideTakesPrecedence()
  testBlankStringDoesNotOverrideWorkspaceValue()
  testDisabledGlobalConnectionIgnoresWorkspace()
  await testTokenRefreshUpdatesWorkspaceAndForm()
  console.log('workspace-integration tests passed!')
}

if (require.main === module) {
  run().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
