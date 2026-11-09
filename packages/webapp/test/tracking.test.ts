import * as assert from 'assert'
import { describe, it } from 'vitest'

import {
  initTracking,
  sanitizeMeasurementId,
  sanitizePixelId,
  trackFormSubmission
} from '../src/pages/form/Render/utils/tracking'

describe('tracking utils', () => {
  it('sanitizes pixelId and measurementId cleanly', () => {
    assert.strictEqual(sanitizePixelId('  751374180786271  '), '751374180786271')
    assert.strictEqual(sanitizePixelId('invalid<script>'), undefined)
    assert.strictEqual(sanitizeMeasurementId('  G-ABC123XYZ  '), 'G-ABC123XYZ')
    assert.strictEqual(sanitizeMeasurementId('UA-123456-1'), 'UA-123456-1')
    assert.strictEqual(sanitizeMeasurementId('bad_id'), undefined)
  })

  it('initializes fbq and gtag safely with dummy window', () => {
    const fakeWindow: any = {}
    initTracking(
      {
        'facebook-pixel': { pixelId: '751374180786271' },
        'google-analytics': { measurementId: 'G-TEST1234' }
      },
      fakeWindow
    )

    assert.ok(typeof fakeWindow.fbq === 'function')
    assert.ok(Array.isArray(fakeWindow.dataLayer))
    assert.ok(typeof fakeWindow.gtag === 'function')
  })

  it('tracks form submission events without errors', () => {
    const calls: any[] = []
    const fakeWindow: any = {
      fbq: (...args: any[]) => calls.push({ type: 'fbq', args }),
      gtag: (...args: any[]) => calls.push({ type: 'gtag', args })
    }

    trackFormSubmission(
      {
        'facebook-pixel': { pixelId: '751374180786271' },
        'google-analytics': { measurementId: 'G-TEST1234' }
      },
      { formId: 'form_1', formName: 'Lead Form' },
      fakeWindow
    )

    assert.strictEqual(calls.length, 2)
    assert.deepStrictEqual(calls[0], {
      type: 'fbq',
      args: ['track', 'Lead', { content_name: 'Lead Form', form_id: 'form_1' }]
    })
    assert.deepStrictEqual(calls[1], {
      type: 'gtag',
      args: ['event', 'generate_lead', { form_id: 'form_1', form_name: 'Lead Form' }]
    })
  })
})
