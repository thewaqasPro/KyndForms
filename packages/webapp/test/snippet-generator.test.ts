import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

import {
  extractFormInputFields,
  generateAllSnippets,
  generateFieldSlug
} from '../src/pages/form/Share/utils/snippet-generator'

function testFiltersOutNonInputFields() {
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
}

function testSlugifiesCleanUniqueNames() {
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
}

function testGeneratesAllSnippetsWithDynamicFieldsAndHiddenFields() {
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
  assert(snippets.html.includes('action="https://forms.kyndstudio.com/f/dVljkyBz"'))
  assert(snippets.html.includes('name="name"'))
  assert(snippets.html.includes('name="email"'))
  assert(snippets.html.includes('name="interests[]"'))
  assert(snippets.html.includes('name="utm_source"'))
  assert(snippets.html.includes('name="_gotcha"'))
  assert(snippets.html.includes('name="_next"'))

  // Next.js
  assert(snippets.nextjs.includes("formData.get('name')"))
  assert(snippets.nextjs.includes("formData.getAll('interests[]')"))
  assert(snippets.nextjs.includes('utm_source'))

  // Astro
  assert(snippets.astro.includes('https://forms.kyndstudio.com/f/dVljkyBz'))
  assert(snippets.astro.includes('name="name"'))
  assert(snippets.astro.includes('name="email"'))

  // cURL
  assert(snippets.curl.includes('curl -X POST https://forms.kyndstudio.com/f/dVljkyBz'))
  assert(snippets.curl.includes('"name":'))
  assert(snippets.curl.includes('"email":'))
}

function testGeneratesFileUploadSnippets() {
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

  assert(snippets.html.includes('enctype="multipart/form-data"'))
  assert(snippets.html.includes('type="file"'))
  assert(snippets.nextjs.includes('const body = formData'))
  assert(snippets.astro.includes('body: formData'))
}

function run() {
  testFiltersOutNonInputFields()
  testSlugifiesCleanUniqueNames()
  testGeneratesAllSnippetsWithDynamicFieldsAndHiddenFields()
  testGeneratesFileUploadSnippets()
}

if (require.main === module) {
  run()
}
