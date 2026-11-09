import * as assert from 'assert'

import facebookPixel from '../src/apps/facebook-pixel'
import googleAnalytics from '../src/apps/google-analytics'

async function testFacebookPixelAppDefinition() {
  assert.strictEqual(facebookPixel.id, 'facebook-pixel')
  assert.strictEqual(facebookPixel.name, 'Facebook Pixel')
  assert.strictEqual(facebookPixel.icon, '/static/facebookpixel.png')
  assert.ok(facebookPixel.description.includes('Meta'))
  assert.strictEqual(facebookPixel.settings.length, 1)

  const setting = facebookPixel.settings[0]
  assert.strictEqual(setting.name, 'pixelId')
  assert.strictEqual(setting.required, true)
}

async function testGoogleAnalyticsAppDefinition() {
  assert.strictEqual(googleAnalytics.id, 'google-analytics')
  assert.strictEqual(googleAnalytics.name, 'Google Analytics')
  assert.strictEqual(googleAnalytics.icon, '/static/googleanalytics.png')
  assert.ok(googleAnalytics.description.includes('GA4'))
  assert.strictEqual(googleAnalytics.settings.length, 1)

  const setting = googleAnalytics.settings[0]
  assert.strictEqual(setting.name, 'measurementId')
  assert.strictEqual(setting.required, true)
}

async function run() {
  await testFacebookPixelAppDefinition()
  await testGoogleAnalyticsAppDefinition()
  console.log('analytics-apps tests passed!')
}

if (require.main === module) {
  run().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
