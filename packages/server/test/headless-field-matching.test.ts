import { FieldKindEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function matchFieldKey(key: string, formFields: any[]): any {
  const lowerKey = key.toLowerCase().trim()
  const normKey = normalizeKey(key)

  return formFields.find(f => {
    const title = typeof f.title === 'string' ? f.title : f.label || ''
    const normTitle = normalizeKey(title)
    const normId = normalizeKey(f.id)
    const normLabel = normalizeKey(f.label || '')

    return (
      f.id === key ||
      normId === normKey ||
      normTitle === normKey ||
      normLabel === normKey ||
      (lowerKey === 'name' && (f.kind === FieldKindEnum.FULL_NAME || normTitle === 'full name')) ||
      (lowerKey === 'phone' &&
        (f.kind === FieldKindEnum.PHONE_NUMBER || normTitle === 'phone number'))
    )
  })
}

function isConfiguredHiddenField(key: string, hiddenFields: any[] = []): boolean {
  const normKey = normalizeKey(key)
  return hiddenFields.some(h => h.id === key || h.name === key || normalizeKey(h.name) === normKey)
}

function run() {
  const fields = [
    { id: 'f_budget', title: 'What is your budget?', kind: FieldKindEnum.NUMBER },
    { id: 'f_name', title: 'Full Name', kind: FieldKindEnum.FULL_NAME },
    { id: 'f_services', title: 'Interested Services', kind: FieldKindEnum.MULTIPLE_CHOICE }
  ]
  const hiddenFields = [
    { id: 'client_id', name: 'client_id' },
    { id: 'source_campaign', name: 'source_campaign' }
  ]

  // Slugified key matching question with question mark and spaces
  const matchedBudget = matchFieldKey('what_is_your_budget', fields)
  assert.strictEqual(matchedBudget?.id, 'f_budget')

  const matchedBudgetDash = matchFieldKey('what-is-your-budget', fields)
  assert.strictEqual(matchedBudgetDash?.id, 'f_budget')

  const matchedName = matchFieldKey('name', fields)
  assert.strictEqual(matchedName?.id, 'f_name')

  // Configured hidden fields
  assert.strictEqual(isConfiguredHiddenField('client_id', hiddenFields), true)
  assert.strictEqual(isConfiguredHiddenField('source_campaign', hiddenFields), true)
  assert.strictEqual(isConfiguredHiddenField('unknown_field', hiddenFields), false)
}

if (require.main === module) {
  run()
}
