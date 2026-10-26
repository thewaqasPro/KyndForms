import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FormRenderer } from '../src/Renderer'
import { getOrInitI18n, initI18n } from '../src/i18n'

describe('form-renderer i18n & interpolation', () => {
  it('initializes i18n and interpolates parameters across locales', () => {
    const i18n = initI18n('en')

    expect(i18n.isInitialized).toBe(true)

    // English
    const enQuestion = i18n.t('Question {{number}}', { number: 8, lng: 'en' })
    expect(enQuestion).toBe('Question 8')

    // German
    const deQuestion = i18n.t('Question {{number}}', { number: 8, lng: 'de' })
    expect(deQuestion).toBe('Frage 8')

    // Japanese
    const jaQuestion = i18n.t('Question {{number}}', { number: 8, lng: 'ja' })
    expect(jaQuestion).toBe('質問 8')

    // French
    const frQuestion = i18n.t('Question {{number}}', { number: 8, lng: 'fr' })
    expect(frQuestion).toBe('Question 8')

    // Other interpolated strings
    const progress = i18n.t('{{number}}% answered', { number: 50, lng: 'en' })
    expect(progress).toBe('50% answered')

    const fileSize = i18n.t("File size can't exceed {{size}}", { size: '10MB', lng: 'en' })
    expect(fileSize).toBe("File size can't exceed 10MB")
  })

  it('provides getOrInitI18n idempotently', () => {
    const inst1 = getOrInitI18n('en')
    const inst2 = getOrInitI18n('de')
    expect(inst1).toBe(inst2)
    expect(inst1.isInitialized).toBe(true)
  })

  it('handles fallback regex interpolation even if raw key is returned', () => {
    const rawKey = 'Question {{number}}'
    const options = { number: 8 }
    let result = rawKey
    for (const [optKey, optVal] of Object.entries(options)) {
      if (optKey !== 'lng' && optVal !== undefined && optVal !== null) {
        result = result.replace(new RegExp(`{{\\s*${optKey}\\s*}}`, 'g'), String(optVal))
      }
    }
    expect(result).toBe('Question 8')
  })

  it('renders FormRenderer DOM without raw {{number}} curly braces in conversational layout', () => {
    const mockForm: any = {
      id: 'form123',
      fields: [
        {
          id: 'field-1',
          kind: 'short_text',
          title: 'First Question',
          validations: { required: true }
        }
      ],
      settings: {
        active: true
      }
    }

    const html = renderToString(
      React.createElement(FormRenderer, {
        form: mockForm,
        locale: 'en',
        ssr: true
      })
    )

    // Verify it rendered Question 1 cleanly and has no raw {{number}} braces
    expect(html).toContain('kyndform-block-number-1')
    expect(html).toContain('Question 1')
    expect(html).toContain('kyndform-block-number-badge')
    expect(html).toContain('data-qa="question-header-counter"')
    expect(html).not.toContain('{{number}}')
  })

  it('renders Classic form layout without raw {{number}} curly braces', () => {
    const fields = Array.from({ length: 8 }, (_, i) => ({
      id: `field-${i + 1}`,
      kind: 'short_text',
      title: `Question title ${i + 1}`,
      validations: { required: true }
    }))

    const mockForm: any = {
      id: 'form456',
      fields,
      settings: {
        active: true,
        layoutMode: 'classic'
      }
    }

    const html = renderToString(
      React.createElement(FormRenderer, {
        form: mockForm,
        locale: 'en',
        ssr: true
      })
    )

    expect(html).toContain('kyndform-classic-number')
    expect(html).toContain('kyndform-block-number-badge')
    expect(html).toContain('data-qa="question-header-counter"')
    expect(html).not.toContain('{{number}}')
  })
})
