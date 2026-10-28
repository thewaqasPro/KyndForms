import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'
import { describe, expect, it } from 'vitest'

import {
  escapeAttr,
  extractFormInputFields,
  generateAllSnippets,
  generateFieldSlug
} from '../src/pages/form/Share/utils/snippet-generator'

describe('snippet-generator', () => {
  it('filters out non input fields', () => {
    const fields = [
      { id: 'w1', kind: FieldKindEnum.WELCOME, title: 'Welcome' },
      { id: 'f1', kind: FieldKindEnum.SHORT_TEXT, title: 'Company Name' },
      { id: 's1', kind: FieldKindEnum.STATEMENT, title: 'Notice' },
      { id: 'f2', kind: FieldKindEnum.EMAIL, title: 'Work Email' },
      { id: 't1', kind: FieldKindEnum.THANK_YOU, title: 'Thank You' }
    ] as any[]

    const inputs = extractFormInputFields(fields)
    assert.strictEqual(inputs.length, 2)
    assert.strictEqual(inputs[0].id, 'f1')
    assert.strictEqual(inputs[1].id, 'f2')
  })

  it('slugifies clean unique names', () => {
    const existing = new Set<string>()
    const s1 = generateFieldSlug(
      { id: '1', kind: FieldKindEnum.SHORT_TEXT, title: 'What is your company budget?' } as any,
      existing
    )
    assert.strictEqual(s1, 'company_budget')

    const s2 = generateFieldSlug(
      { id: '2', kind: FieldKindEnum.SHORT_TEXT, title: 'What is your company budget?' } as any,
      existing
    )
    assert.strictEqual(s2, 'company_budget_2')
  })

  it('generates all snippets with dynamic fields and hidden fields', () => {
    const fields = [
      { id: 'f1', kind: FieldKindEnum.SHORT_TEXT, title: 'Name', validations: { required: true } },
      { id: 'f2', kind: FieldKindEnum.EMAIL, title: 'Email', validations: { required: true } },
      {
        id: 'f3',
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Interests',
        properties: {
          allowMultiple: true,
          choices: [{ label: 'Design' }, { label: 'Code' }]
        }
      }
    ] as any[]

    const hiddenFields = [{ id: 'utm_source', name: 'utm_source' }]
    const endpointUrl = 'https://forms.kyndstudio.com/f/dVljkyBz'

    const snippets = generateAllSnippets({
      endpointUrl,
      fields,
      hiddenFields,
      redirectUrl: 'https://mysite.com/thanks'
    })

    // HTML
    assert.ok(snippets.html.includes('action="https://forms.kyndstudio.com/f/dVljkyBz"'))
    assert.ok(snippets.html.includes('name="name"'))
    assert.ok(snippets.html.includes('name="email"'))
    assert.ok(snippets.html.includes('name="interests[]"'))
    assert.ok(snippets.html.includes('name="utm_source"'))
    assert.ok(snippets.html.includes('name="_gotcha"'))
    assert.ok(snippets.html.includes('name="_next"'))

    // Next.js
    assert.ok(snippets.nextjs.includes("formData.get('name')"))
    assert.ok(snippets.nextjs.includes("formData.getAll('interests[]')"))
    assert.ok(snippets.nextjs.includes('utm_source'))

    // Astro
    assert.ok(snippets.astro.includes('https://forms.kyndstudio.com/f/dVljkyBz'))
    assert.ok(snippets.astro.includes('name="name"'))
    assert.ok(snippets.astro.includes('name="email"'))

    // cURL
    assert.ok(snippets.curl.includes('curl -X POST https://forms.kyndstudio.com/f/dVljkyBz'))
    assert.ok(snippets.curl.includes('"name":'))
    assert.ok(snippets.curl.includes('"email":'))
  })

  it('generates file upload snippets', () => {
    const fields = [
      { id: 'f1', kind: FieldKindEnum.SHORT_TEXT, title: 'Name' },
      { id: 'f2', kind: FieldKindEnum.FILE_UPLOAD, title: 'Resume' }
    ] as any[]

    const endpointUrl = 'https://forms.kyndstudio.com/f/dVljkyBz'
    const snippets = generateAllSnippets({
      endpointUrl,
      fields,
      hiddenFields: []
    })

    assert.ok(snippets.html.includes('enctype="multipart/form-data"'))
    assert.ok(snippets.html.includes('type="file"'))
    assert.ok(snippets.nextjs.includes('const body = formData'))
    assert.ok(snippets.astro.includes('body: formData'))
  })

  it('escapes quotes and special characters in field titles and choices', () => {
    const fields = [
      {
        id: 'f1',
        kind: FieldKindEnum.SHORT_TEXT,
        title: 'Your "Nickname" <Preferred>'
      },
      {
        id: 'f2',
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        title: 'Choose "Plan"',
        properties: {
          choices: [{ label: 'Option "A"' }, { label: 'Option <B>' }]
        }
      }
    ] as any[]

    const snippets = generateAllSnippets({
      endpointUrl: 'https://forms.kyndstudio.com/f/test',
      fields
    })

    // Assert that quotes and angle brackets are escaped in HTML placeholder & option
    expect(snippets.html).toContain('placeholder="Your &quot;Nickname&quot; &lt;Preferred&gt;"')
    expect(snippets.html).toContain('value="Option &quot;A&quot;"')
    expect(snippets.html).toContain('value="Option &lt;B&gt;"')

    // Next.js
    expect(snippets.nextjs).toContain('placeholder="Your &quot;Nickname&quot; &lt;Preferred&gt;"')
    expect(snippets.nextjs).toContain('value="Option &quot;A&quot;"')

    // Astro
    expect(snippets.astro).toContain('placeholder="Your &quot;Nickname&quot; &lt;Preferred&gt;"')
    expect(snippets.astro).toContain('value="Option &quot;A&quot;"')
  })

  it('escapeAttr escapes special characters properly', () => {
    expect(escapeAttr('hello "world" & <tag>')).toBe('hello &quot;world&quot; &amp; &lt;tag&gt;')
  })
})
