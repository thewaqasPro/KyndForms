# Dynamic Headless Form Integration Snippets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Headless Form integration snippets in KyndForm (`HTML`, `Next.js`, `Astro.js`, and `cURL`) from static dummy examples into dynamic code generators that reflect the actual question fields, choices, validations, and hidden fields of the form currently being edited or shared.

**Architecture:**
1. A new frontend generator utility (`snippet-generator.ts`) parses the form's `drafts` and `hiddenFields`, filtering out layout blocks (`welcome`, `thank_you`, `statement`), assigning clean unique slugs (`full_name`, `email`, `budget`), and generating tailored HTML, Next.js, Astro, and cURL snippets.
2. `HeadlessModal.tsx` consumes the current form state from `useFormStore()`, displaying dynamic snippets with a summary badge and clean empty-state fallback.
3. The server headless submission controller (`headless-form.controller.ts`) is enhanced with normalized slug matching (`normalizeKey`) so that any generated field slug (e.g., `company_budget` for a question titled "Company Budget?") matches seamlessly without auto-creating duplicate fields, and custom hidden fields defined in `form.hiddenFields` are properly recognized.

**Tech Stack:** TypeScript, React, Next.js, Astro, GraphQL/Apollo, NestJS, `@kyndform/answer-utils`, `@kyndform/shared-types-enums`.

**Spec:** Current Form Share Headless Modal (`packages/webapp/src/pages/form/Share/HeadlessModal.tsx`) and Headless Controller (`packages/server/src/controller/headless-form.controller.ts`).

## Global Constraints
- Preserve all 9 KyndForm Protected Capabilities from `AGENTS.md` (no regressions on Headless Form engine, Answer Utils, Embed Engine).
- Rebranding Integrity: No HeyForm strings or domains (`heyform.com`). First-party KyndForm URLs and assets only.
- Single Root Lockfile: Do not run `pnpm install` in subdirectories.
- Verification Protocol: Mandatory exit code 0 on:
  - `pnpm run verify:integrity`
  - `pnpm run type-check`
  - `pnpm test`
  - `pnpm lint`

## Review Focus
1. **Empty Form Drafts**: A new form with 0 question fields must render a helpful notification with fallback example code rather than empty/broken snippets.
2. **File Upload Forms**: If any question is `FILE_UPLOAD`, HTML forms must specify `enctype="multipart/form-data"`, and Next.js/Astro scripts must submit `FormData` directly without forcing `application/json`.
3. **Multi-Select & Checkbox Arrays**: Multiple-choice fields with `allowMultiple` must use `name="field_name[]"` and Next.js/Astro handlers must retrieve them via `formData.getAll(...)`.
4. **Custom Hidden Fields**: Hidden fields defined in `form.hiddenFields` (e.g., `client_id`, `company_name`) must be included in all 4 snippets alongside standard `utm_*` tracking and honeypot `_gotcha`.
5. **Slug Normalization & Matching**: Questions containing punctuation or spaces (e.g., "What is your budget?") must match incoming slugs (`what_is_your_budget`) on the backend without triggering `autoCreateFields`.

---

### Task 1: Backend Normalized Field & Hidden Field Key Matching

**Files:**
- Modify: `packages/server/src/controller/headless-form.controller.ts:460-505`
- Create: `packages/server/test/headless-field-matching.test.ts`

**Interfaces:**
- Produces: `normalizeKey(str: string): string` and enhanced matching in `HeadlessFormController.submitForm`.
- Consumes: `form.fields`, `form.hiddenFields`, `FieldKindEnum`.

- [ ] **Step 1: Write the failing test for normalized headless field and hidden field matching**

Create `packages/server/test/headless-field-matching.test.ts`:
```ts
import * as assert from 'assert'
import { FieldKindEnum } from '@kyndform/shared-types-enums'

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[-_\s]+/g, ' ').replace(/[^\w\s]/g, '').trim()
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
      (lowerKey === 'phone' && (f.kind === FieldKindEnum.PHONE_NUMBER || normTitle === 'phone number'))
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
```

- [ ] **Step 2: Run test to verify it passes in isolation**

Run: `pnpm --filter kyndform-server exec ts-node --transpile-only -r tsconfig-paths/register test/headless-field-matching.test.ts`
Expected: Exited with code 0.

- [ ] **Step 3: Implement normalized matching in `packages/server/src/controller/headless-form.controller.ts`**

In `packages/server/src/controller/headless-form.controller.ts`:
1. Add helper `normalizeKey(str: string): string`:
```ts
function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}
```
2. In `submitForm`:
Check configured hidden fields from `form.hiddenFields`:
```ts
const isConfiguredHidden = formHiddenFields.some(
  h => h.id === key || h.name === key || normalizeKey(h.name) === normalizeKey(key)
)
if (isHiddenFieldKey(key) || isConfiguredHidden) {
  hiddenFields.push({
    id: key,
    name: key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
  })
  if (!formHiddenFields.some(h => h.id === key || h.name === key)) {
    const newHf: HiddenField = { id: key, name: key }
    newHiddenFields.push(newHf)
    formHiddenFields.push(newHf)
  }
  continue
}
```
3. In `existingField` search:
```ts
const lowerKey = key.toLowerCase().trim()
const normKey = normalizeKey(key)
let existingField = formFields.find(f => {
  const plainTitle = getFieldPlainTitle(f).toLowerCase().trim()
  const label = (f.label || '').toLowerCase().trim()
  const normTitle = normalizeKey(plainTitle)
  const normLabel = normalizeKey(label)
  const normId = normalizeKey(f.id)

  return (
    f.id === key ||
    normId === normKey ||
    label === lowerKey ||
    normLabel === normKey ||
    plainTitle === lowerKey ||
    normTitle === normKey ||
    (lowerKey === 'name' &&
      (f.kind === FieldKindEnum.FULL_NAME || plainTitle === 'full name' || normTitle === 'full name')) ||
    (lowerKey === 'phone' &&
      (f.kind === FieldKindEnum.PHONE_NUMBER || plainTitle === 'phone number' || normTitle === 'phone number'))
  )
})
```

- [ ] **Step 4: Run server tests to verify backward compatibility and new matching**

Run: `pnpm --filter kyndform-server exec ts-node --transpile-only -r tsconfig-paths/register test/headless-field-matching.test.ts`
Expected: Exited with code 0.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/controller/headless-form.controller.ts packages/server/test/headless-field-matching.test.ts
git commit -m "feat(server): support normalized slug matching and configured hidden fields in headless submissions"
```

---

### Task 2: Frontend Dynamic Snippet Generator Utility

**Files:**
- Create: `packages/webapp/src/pages/form/Share/utils/snippet-generator.ts`
- Create: `packages/webapp/test/snippet-generator.test.ts`

**Interfaces:**
- Produces:
  - `generateFieldSlug(field: FormFieldType, existingSlugs: Set<string>): string`
  - `extractFormInputFields(drafts?: FormFieldType[]): FormFieldType[]`
  - `generateHtmlSnippet(options: SnippetGeneratorOptions): string`
  - `generateNextJsSnippet(options: SnippetGeneratorOptions): string`
  - `generateAstroSnippet(options: SnippetGeneratorOptions): string`
  - `generateCurlSnippet(options: SnippetGeneratorOptions): string`
  - `generateAllSnippets(options: SnippetGeneratorOptions): SnippetResults`
- Consumes: `FormFieldType`, `HiddenField`, `FormSettings`, `FieldKindEnum`, `htmlUtils`.

- [ ] **Step 1: Write the unit test for `snippet-generator`**

Create `packages/webapp/test/snippet-generator.test.ts`:
```ts
import * as assert from 'assert'
import { FieldKindEnum } from '@kyndform/shared-types-enums'
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
  const s1 = generateFieldSlug({ id: '1', kind: FieldKindEnum.SHORT_TEXT, title: 'What is your company budget?' } as any, existing)
  assert.strictEqual(s1, 'company_budget')

  const s2 = generateFieldSlug({ id: '2', kind: FieldKindEnum.SHORT_TEXT, title: 'What is your company budget?' } as any, existing)
  assert.strictEqual(s2, 'company_budget_2')
}

function testGeneratesAllSnippetsWithDynamicFieldsAndHiddenFields() {
  const fields = [
    { id: 'f1', kind: FieldKindEnum.SHORT_TEXT, title: 'Name', validations: { required: true } },
    { id: 'f2', kind: FieldKindEnum.EMAIL, title: 'Email', validations: { required: true } },
    { id: 'f3', kind: FieldKindEnum.MULTIPLE_CHOICE, title: 'Interests', properties: { allowMultiple: true, choices: [{ label: 'Design' }, { label: 'Code' }] } }
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

  // Next.js
  assert(snippets.nextjs.includes('formData.get(\'name\')'))
  assert(snippets.nextjs.includes('formData.getAll(\'interests[]\')'))
  assert(snippets.nextjs.includes('utm_source'))

  // Astro
  assert(snippets.astro.includes('https://forms.kyndstudio.com/f/dVljkyBz'))
  assert(snippets.astro.includes('name="name"'))

  // cURL
  assert(snippets.curl.includes('curl -X POST https://forms.kyndstudio.com/f/dVljkyBz'))
  assert(snippets.curl.includes('"name":'))
  assert(snippets.curl.includes('"email":'))
}

function run() {
  testFiltersOutNonInputFields()
  testSlugifiesCleanUniqueNames()
  testGeneratesAllSnippetsWithDynamicFieldsAndHiddenFields()
}

if (require.main === module) {
  run()
}
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `pnpm --filter kyndform-webapp exec ts-node --transpile-only test/snippet-generator.test.ts`
Expected: FAIL (Cannot find module `../src/pages/form/Share/utils/snippet-generator`).

- [ ] **Step 3: Implement `packages/webapp/src/pages/form/Share/utils/snippet-generator.ts`**

Implement comprehensive field extraction, slugification, and snippet templating for HTML, Next.js, Astro, and cURL:
- Supports all KyndForm input types: `SHORT_TEXT`, `LONG_TEXT`, `EMAIL`, `PHONE_NUMBER`, `NUMBER`, `DATE`, `DATE_RANGE`, `URL`, `YES_NO`, `MULTIPLE_CHOICE`, `PICTURE_CHOICE`, `DROPDOWN`, `RATING`, `OPINION_SCALE`, `FILE_UPLOAD`, `FULL_NAME`, `ADDRESS`.
- Formats multi-select with array brackets `name="interests[]"`.
- Formats single select with `<select name="service">` or radio buttons.
- Formats hidden fields with current `form.hiddenFields`.
- Handles file uploads (`enctype="multipart/form-data"` and Next.js/Astro `FormData` submission without forced JSON).
- Provides realistic placeholder and sample values for cURL JSON.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter kyndform-webapp exec ts-node --transpile-only test/snippet-generator.test.ts`
Expected: Exited with code 0.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/pages/form/Share/utils/snippet-generator.ts packages/webapp/test/snippet-generator.test.ts
git commit -m "feat(webapp): add dynamic headless snippet generator for HTML, Next.js, Astro, and cURL"
```

---

### Task 3: Integrate Dynamic Generator into HeadlessModal Component

**Files:**
- Modify: `packages/webapp/src/pages/form/Share/HeadlessModal.tsx`

**Interfaces:**
- Consumes: `useFormStore()`, `generateAllSnippets`, `extractFormInputFields`.
- Updates: Renders dynamic code snippets with badge indicator and zero-field fallback.

- [ ] **Step 1: Update `HeadlessModal.tsx` with `useFormStore` and dynamic snippet generation**

1. Import `useFormStore` from `@/store` and `generateAllSnippets`, `extractFormInputFields` from `./utils/snippet-generator`.
2. Retrieve `form` from `useFormStore()`.
3. Memoize input fields and snippets:
```tsx
const inputFields = useMemo(() => extractFormInputFields(form?.drafts || form?.fields), [form?.drafts, form?.fields])
const hiddenFields = useMemo(() => form?.hiddenFields || [], [form?.hiddenFields])

const snippets = useMemo(() => {
  return generateAllSnippets({
    endpointUrl,
    fields: inputFields,
    hiddenFields,
    redirectUrl: form?.settings?.redirectUrl
  })
}, [endpointUrl, inputFields, hiddenFields, form?.settings?.redirectUrl])
```
4. Add summary badge above snippets:
```tsx
<div className="flex items-center gap-2 text-xs text-secondary">
  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
    {inputFields.length} {inputFields.length === 1 ? 'Question Field' : 'Question Fields'}
  </span>
  {hiddenFields.length > 0 && (
    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium text-slate-700 dark:text-slate-300">
      {hiddenFields.length} {hiddenFields.length === 1 ? 'Hidden Field' : 'Hidden Fields'}
    </span>
  )}
</div>
```
5. If `inputFields.length === 0`:
Render an informative helper banner:
"This form does not have any input questions yet. The snippets below show standard starter fields. Add questions in the Builder to customize these snippets with your exact fields."

- [ ] **Step 2: Verify component compiles with type-check**

Run: `pnpm --filter kyndform-webapp type-check`
Expected: Exited with code 0.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/pages/form/Share/HeadlessModal.tsx
git commit -m "feat(webapp): connect HeadlessModal to live form fields and hidden fields"
```

---

### Task 4: Full Suite Verification & E2E Validation

**Files:**
- Test across workspace.

- [ ] **Step 1: Execute mandatory architectural integrity check**
Run: `pnpm run verify:integrity`
Expected: Exit code 0 (all 14 checks passed).

- [ ] **Step 2: Execute TypeScript verification across all packages**
Run: `pnpm run type-check`
Expected: Exit code 0.

- [ ] **Step 3: Execute unit tests**
Run: `pnpm test`
Expected: Exit code 0.

- [ ] **Step 4: Execute workspace linter**
Run: `pnpm lint`
Expected: Exit code 0 with 0 errors.

- [ ] **Step 5: Commit changes and prepare review walkthrough**
```bash
git commit --allow-empty -m "chore: complete dynamic headless integration snippets implementation"
```
