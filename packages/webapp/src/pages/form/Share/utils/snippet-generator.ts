import { FieldKindEnum, HiddenField, UNSELECTABLE_FIELD_KINDS } from '@kyndform/shared-types-enums'

import { htmlUtils } from '@kyndform/answer-utils'

export interface FormFieldLike {
  id: string
  kind: FieldKindEnum
  title?: any
  label?: string
  validations?: {
    required?: boolean
    min?: number
    max?: number
    [key: string]: any
  }
  properties?: {
    choices?: Array<{ id?: string; label?: string; value?: any }>
    allowMultiple?: boolean
    total?: number
    start?: number
    fields?: FormFieldLike[]
    [key: string]: any
  }
}

export interface SnippetGeneratorOptions {
  endpointUrl: string
  fields?: FormFieldLike[]
  hiddenFields?: HiddenField[]
  redirectUrl?: string
}

export interface SnippetResults {
  html: string
  nextjs: string
  astro: string
  curl: string
}

export function extractPlainTitle(title: any, fallback = ''): string {
  if (typeof title === 'string') {
    return title.trim()
  }
  if (Array.isArray(title)) {
    try {
      const serialized = htmlUtils.serialize(title as any)
      const plain = htmlUtils.plain(serialized).trim()
      if (plain) return plain
    } catch {
      // fallback below
    }
  }
  return fallback
}

export function extractFormInputFields(fields?: FormFieldLike[]): FormFieldLike[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    return []
  }

  const result: FormFieldLike[] = []

  for (const field of fields) {
    if (!field || !field.kind) continue

    // Handle nested group fields
    if (field.kind === FieldKindEnum.GROUP && Array.isArray(field.properties?.fields)) {
      result.push(...extractFormInputFields(field.properties.fields))
      continue
    }

    // Skip welcome screens, thank you screens, statements, and non-input blocks
    if (
      UNSELECTABLE_FIELD_KINDS.includes(field.kind) ||
      field.kind === FieldKindEnum.WELCOME ||
      field.kind === FieldKindEnum.THANK_YOU ||
      field.kind === FieldKindEnum.STATEMENT ||
      field.kind === FieldKindEnum.GROUP
    ) {
      continue
    }

    result.push(field)
  }

  return result
}

const STOP_WORDS = new Set([
  'what',
  'is',
  'your',
  'the',
  'please',
  'enter',
  'provide',
  'tell',
  'us',
  'about',
  'how',
  'do',
  'you',
  'can',
  'we',
  'get',
  'in',
  'to',
  'a',
  'an'
])

export function generateFieldSlug(field: FormFieldLike, existingSlugs = new Set<string>()): string {
  const plainTitle = extractPlainTitle(field.title, field.label || '')
  let base = ''

  const lowerTitle = plainTitle.toLowerCase()

  if (field.kind === FieldKindEnum.EMAIL || lowerTitle.includes('email')) {
    base = 'email'
  } else if (
    field.kind === FieldKindEnum.FULL_NAME ||
    (lowerTitle.includes('name') &&
      !lowerTitle.includes('company') &&
      !lowerTitle.includes('project'))
  ) {
    base = 'name'
  } else if (
    field.kind === FieldKindEnum.PHONE_NUMBER ||
    lowerTitle.includes('phone') ||
    lowerTitle.includes('mobile')
  ) {
    base = 'phone'
  } else if (field.kind === FieldKindEnum.URL || lowerTitle.includes('website')) {
    base = 'website'
  } else if (
    field.kind === FieldKindEnum.FILE_UPLOAD ||
    lowerTitle.includes('resume') ||
    lowerTitle.includes('file')
  ) {
    base = lowerTitle.includes('resume') ? 'resume' : 'file_upload'
  } else if (
    field.kind === FieldKindEnum.LONG_TEXT &&
    (lowerTitle.includes('message') ||
      lowerTitle.includes('comment') ||
      lowerTitle.includes('note'))
  ) {
    base = 'message'
  } else if (plainTitle) {
    const words = plainTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/[\s_-]+/)
      .filter(Boolean)

    const filtered = words.length > 2 ? words.filter(w => !STOP_WORDS.has(w)) : words
    base = (filtered.length > 0 ? filtered : words).slice(0, 4).join('_')
  }

  if (!base) {
    base = field.kind.toLowerCase()
  }

  let uniqueSlug = base
  let counter = 2
  while (existingSlugs.has(uniqueSlug)) {
    uniqueSlug = `${base}_${counter}`
    counter++
  }

  existingSlugs.add(uniqueSlug)
  return uniqueSlug
}

interface ProcessedField {
  field: FormFieldLike
  slug: string
  title: string
  isRequired: boolean
  isMultiSelect: boolean
  choices: string[]
}

function processFields(fields: FormFieldLike[]): ProcessedField[] {
  const existingSlugs = new Set<string>()

  return fields.map(field => {
    const slug = generateFieldSlug(field, existingSlugs)
    const title = extractPlainTitle(field.title, field.label || slug)
    const isRequired = Boolean(field.validations?.required)
    const isMultiSelect =
      (field.kind === FieldKindEnum.MULTIPLE_CHOICE ||
        field.kind === FieldKindEnum.PICTURE_CHOICE) &&
      Boolean(field.properties?.allowMultiple)

    const choices: string[] = []
    if (Array.isArray(field.properties?.choices)) {
      for (const choice of field.properties.choices) {
        if (choice?.label) {
          choices.push(choice.label)
        }
      }
    }

    return {
      field,
      slug,
      title,
      isRequired,
      isMultiSelect,
      choices
    }
  })
}

export function generateHtmlSnippet({
  endpointUrl,
  fields = [],
  hiddenFields = [],
  redirectUrl
}: SnippetGeneratorOptions): string {
  const processed = processFields(fields)
  const hasFileUpload = processed.some(p => p.field.kind === FieldKindEnum.FILE_UPLOAD)

  const elements: string[] = []

  elements.push(`<!-- Form Endpoint: POST submissions directly to KyndForm -->`)
  elements.push(
    `<form action="${endpointUrl}" method="POST"${hasFileUpload ? ' enctype="multipart/form-data"' : ''}>`
  )

  if (processed.length === 0) {
    elements.push(`  <!-- Core Form Fields -->`)
    elements.push(`  <div>`)
    elements.push(`    <label for="name">Name</label>`)
    elements.push(
      `    <input id="name" type="text" name="name" placeholder="Your Name" required />`
    )
    elements.push(`  </div>`)
    elements.push(`  <div>`)
    elements.push(`    <label for="email">Email</label>`)
    elements.push(
      `    <input id="email" type="email" name="email" placeholder="Your Email" required />`
    )
    elements.push(`  </div>`)
    elements.push(`  <div>`)
    elements.push(`    <label for="message">Message</label>`)
    elements.push(
      `    <textarea id="message" name="message" placeholder="Your Message"></textarea>`
    )
    elements.push(`  </div>`)
  } else {
    for (const p of processed) {
      const { field, slug, title, isRequired, isMultiSelect, choices } = p
      const reqAttr = isRequired ? ' required' : ''

      elements.push(`  <!-- ${title} -->`)
      elements.push(`  <div>`)

      switch (field.kind) {
        case FieldKindEnum.LONG_TEXT:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <textarea id="${slug}" name="${slug}" placeholder="${title}"${reqAttr}></textarea>`
          )
          break

        case FieldKindEnum.EMAIL:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <input id="${slug}" type="email" name="${slug}" placeholder="name@example.com"${reqAttr} />`
          )
          break

        case FieldKindEnum.PHONE_NUMBER:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <input id="${slug}" type="tel" name="${slug}" placeholder="+1 (555) 000-0000"${reqAttr} />`
          )
          break

        case FieldKindEnum.NUMBER:
        case FieldKindEnum.RATING:
        case FieldKindEnum.OPINION_SCALE: {
          const min = field.properties?.start ?? field.validations?.min ?? 0
          const max = field.properties?.total ?? field.validations?.max ?? 100
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <input id="${slug}" type="number" name="${slug}" min="${min}" max="${max}" placeholder="${title}"${reqAttr} />`
          )
          break
        }

        case FieldKindEnum.DATE:
        case FieldKindEnum.DATE_RANGE:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(`    <input id="${slug}" type="date" name="${slug}"${reqAttr} />`)
          break

        case FieldKindEnum.URL:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <input id="${slug}" type="url" name="${slug}" placeholder="https://example.com"${reqAttr} />`
          )
          break

        case FieldKindEnum.YES_NO:
          elements.push(
            `    <label><input type="checkbox" name="${slug}" value="true"${reqAttr} /> ${title}${isRequired ? ' *' : ''}</label>`
          )
          break

        case FieldKindEnum.MULTIPLE_CHOICE:
        case FieldKindEnum.PICTURE_CHOICE:
          if (isMultiSelect) {
            elements.push(`    <fieldset>`)
            elements.push(`      <legend>${title}${isRequired ? ' *' : ''}</legend>`)
            if (choices.length > 0) {
              for (const choice of choices) {
                elements.push(
                  `      <label><input type="checkbox" name="${slug}[]" value="${choice}" /> ${choice}</label>`
                )
              }
            } else {
              elements.push(
                `      <label><input type="checkbox" name="${slug}[]" value="Option 1" /> Option 1</label>`
              )
              elements.push(
                `      <label><input type="checkbox" name="${slug}[]" value="Option 2" /> Option 2</label>`
              )
            }
            elements.push(`    </fieldset>`)
          } else {
            elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
            elements.push(`    <select id="${slug}" name="${slug}"${reqAttr}>`)
            elements.push(`      <option value="">Select an option</option>`)
            for (const choice of choices) {
              elements.push(`      <option value="${choice}">${choice}</option>`)
            }
            elements.push(`    </select>`)
          }
          break

        case FieldKindEnum.FILE_UPLOAD:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(`    <input id="${slug}" type="file" name="${slug}"${reqAttr} />`)
          break

        default:
          elements.push(`    <label for="${slug}">${title}${isRequired ? ' *' : ''}</label>`)
          elements.push(
            `    <input id="${slug}" type="text" name="${slug}" placeholder="${title}"${reqAttr} />`
          )
          break
      }

      elements.push(`  </div>`)
    }
  }

  // Hidden fields
  if (hiddenFields.length > 0) {
    elements.push(`\n  <!-- Configured Hidden Fields -->`)
    for (const hf of hiddenFields) {
      const name = hf.name || hf.id
      elements.push(`  <input type="hidden" name="${name}" value="" />`)
    }
  }

  // Honeypot spam trap
  elements.push(`\n  <!-- Spam Protection (Honeypot - Leave empty for users) -->`)
  elements.push(
    `  <input type="text" name="_gotcha" style="display:none !important" tabIndex="-1" autocomplete="off" />`
  )

  // Redirect on completion
  const nextTarget = redirectUrl || '/thank-you'
  elements.push(`\n  <!-- Optional Redirect After Submission -->`)
  elements.push(`  <input type="hidden" name="_next" value="${nextTarget}" />`)

  elements.push(`\n  <button type="submit">Submit</button>`)
  elements.push(`</form>`)

  return elements.join('\n')
}

export function generateNextJsSnippet({
  endpointUrl,
  fields = [],
  hiddenFields = [],
  redirectUrl
}: SnippetGeneratorOptions): string {
  const processed = processFields(fields)
  const hasFileUpload = processed.some(p => p.field.kind === FieldKindEnum.FILE_UPLOAD)
  const nextTarget = redirectUrl || '/thank-you'

  const fieldExtractions: string[] = []

  if (processed.length === 0) {
    fieldExtractions.push(`      name: formData.get('name'),`)
    fieldExtractions.push(`      email: formData.get('email'),`)
    fieldExtractions.push(`      message: formData.get('message')`)
  } else {
    for (const p of processed) {
      if (p.isMultiSelect) {
        fieldExtractions.push(`      ${p.slug}: formData.getAll('${p.slug}[]'),`)
      } else {
        fieldExtractions.push(`      ${p.slug}: formData.get('${p.slug}'),`)
      }
    }
  }

  for (const hf of hiddenFields) {
    const name = hf.name || hf.id
    fieldExtractions.push(
      `      ${name}: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('${name}') || '' : '',`
    )
  }

  const jsxInputs: string[] = []

  if (processed.length === 0) {
    jsxInputs.push(`      <input name="name" type="text" placeholder="Name" required />`)
    jsxInputs.push(`      <input name="email" type="email" placeholder="Email" required />`)
    jsxInputs.push(`      <textarea name="message" placeholder="Message" />`)
  } else {
    for (const p of processed) {
      const { slug, title, isRequired, isMultiSelect, choices } = p
      const req = isRequired ? ' required' : ''

      if (p.field.kind === FieldKindEnum.LONG_TEXT) {
        jsxInputs.push(`      <textarea name="${slug}" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.EMAIL) {
        jsxInputs.push(`      <input name="${slug}" type="email" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.PHONE_NUMBER) {
        jsxInputs.push(`      <input name="${slug}" type="tel" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.NUMBER) {
        jsxInputs.push(`      <input name="${slug}" type="number" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.DATE || p.field.kind === FieldKindEnum.DATE_RANGE) {
        jsxInputs.push(`      <input name="${slug}" type="date"${req} />`)
      } else if (p.field.kind === FieldKindEnum.FILE_UPLOAD) {
        jsxInputs.push(`      <input name="${slug}" type="file"${req} />`)
      } else if (isMultiSelect) {
        jsxInputs.push(`      <div className="space-y-1">`)
        jsxInputs.push(`        <p className="text-sm font-medium">${title}</p>`)
        for (const choice of choices) {
          jsxInputs.push(
            `        <label className="flex items-center gap-2"><input type="checkbox" name="${slug}[]" value="${choice}" /> ${choice}</label>`
          )
        }
        jsxInputs.push(`      </div>`)
      } else if (choices.length > 0) {
        jsxInputs.push(`      <select name="${slug}"${req}>`)
        jsxInputs.push(`        <option value="">Select ${title}</option>`)
        for (const choice of choices) {
          jsxInputs.push(`        <option value="${choice}">${choice}</option>`)
        }
        jsxInputs.push(`      </select>`)
      } else {
        jsxInputs.push(`      <input name="${slug}" type="text" placeholder="${title}"${req} />`)
      }
    }
  }

  const payloadBlock = hasFileUpload
    ? `    // Submitting with file attachment using FormData directly
    const body = formData`
    : `    const data = {
${fieldExtractions.join('\n')}
    }
    const body = JSON.stringify(data)`

  const headersBlock = hasFileUpload
    ? `      headers: {
        Accept: 'application/json'
      },`
    : `      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },`

  return `'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const form = e.currentTarget
    const formData = new FormData(form)

${payloadBlock}

    try {
      const res = await fetch('${endpointUrl}', {
        method: 'POST',
${headersBlock}
        body
      })

      if (res.ok) {
        setStatus('success')
        form.reset()
        // If redirecting: window.location.href = '${nextTarget}'
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
${jsxInputs.join('\n')}

      {/* Spam Protection Honeypot */}
      <input name="_gotcha" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

      <button type="submit" disabled={status === 'loading'} className="cursor-pointer rounded-lg bg-black px-4 py-2 text-white">
        {status === 'loading' ? 'Sending...' : 'Submit'}
      </button>

      {status === 'success' && <p className="text-sm text-green-600">Thank you! Your response has been received.</p>}
      {status === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
    </form>
  )
}`
}

export function generateAstroSnippet({
  endpointUrl,
  fields = [],
  hiddenFields = [],
  redirectUrl
}: SnippetGeneratorOptions): string {
  const processed = processFields(fields)
  const hasFileUpload = processed.some(p => p.field.kind === FieldKindEnum.FILE_UPLOAD)
  const nextTarget = redirectUrl || '/thank-you'

  const inputs: string[] = []

  if (processed.length === 0) {
    inputs.push(`  <input type="text" name="name" placeholder="Name" required />`)
    inputs.push(`  <input type="email" name="email" placeholder="Email" required />`)
    inputs.push(`  <textarea name="message" placeholder="Message"></textarea>`)
  } else {
    for (const p of processed) {
      const { slug, title, isRequired, isMultiSelect, choices } = p
      const req = isRequired ? ' required' : ''

      if (p.field.kind === FieldKindEnum.LONG_TEXT) {
        inputs.push(`  <textarea name="${slug}" placeholder="${title}"${req}></textarea>`)
      } else if (p.field.kind === FieldKindEnum.EMAIL) {
        inputs.push(`  <input type="email" name="${slug}" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.PHONE_NUMBER) {
        inputs.push(`  <input type="tel" name="${slug}" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.NUMBER) {
        inputs.push(`  <input type="number" name="${slug}" placeholder="${title}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.DATE || p.field.kind === FieldKindEnum.DATE_RANGE) {
        inputs.push(`  <input type="date" name="${slug}"${req} />`)
      } else if (p.field.kind === FieldKindEnum.FILE_UPLOAD) {
        inputs.push(`  <input type="file" name="${slug}"${req} />`)
      } else if (isMultiSelect) {
        inputs.push(`  <div>`)
        inputs.push(`    <p>${title}</p>`)
        for (const choice of choices) {
          inputs.push(
            `    <label><input type="checkbox" name="${slug}[]" value="${choice}" /> ${choice}</label>`
          )
        }
        inputs.push(`  </div>`)
      } else if (choices.length > 0) {
        inputs.push(`  <select name="${slug}"${req}>`)
        inputs.push(`    <option value="">Select ${title}</option>`)
        for (const choice of choices) {
          inputs.push(`    <option value="${choice}">${choice}</option>`)
        }
        inputs.push(`  </select>`)
      } else {
        inputs.push(`  <input type="text" name="${slug}" placeholder="${title}"${req} />`)
      }
    }
  }

  for (const hf of hiddenFields) {
    const name = hf.name || hf.id
    inputs.push(`  <input type="hidden" name="${name}" value="" />`)
  }

  const multiSelectSlugs = processed.filter(p => p.isMultiSelect).map(p => p.slug)
  const multiSelectParser =
    multiSelectSlugs.length > 0
      ? multiSelectSlugs.map(s => `    data['${s}'] = formData.getAll('${s}[]');`).join('\n')
      : ''

  const submitPayload = hasFileUpload
    ? `    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });`
    : `    const data: Record<string, any> = Object.fromEntries(formData);
${multiSelectParser}
    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(data)
    });`

  return `---
// src/components/ContactForm.astro
---

<form id="contact-form" action="${endpointUrl}" method="POST"${hasFileUpload ? ' enctype="multipart/form-data"' : ''}>
${inputs.join('\n')}

  <!-- Spam Honeypot -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />
  <input type="hidden" name="_next" value="${nextTarget}" />

  <button type="submit">Submit</button>
</form>

<script>
  const form = document.getElementById('contact-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

${submitPayload}

    if (response.ok) {
      window.location.href = '${nextTarget}';
    } else {
      alert('Submission failed. Please try again.');
    }
  });
</script>`
}

export function generateCurlSnippet({
  endpointUrl,
  fields = [],
  hiddenFields = []
}: SnippetGeneratorOptions): string {
  const processed = processFields(fields)
  const sampleObject: Record<string, any> = {}

  if (processed.length === 0) {
    sampleObject['name'] = 'Jane Doe'
    sampleObject['email'] = 'jane@example.com'
    sampleObject['message'] = 'Headless form submission'
  } else {
    for (const p of processed) {
      const { slug, field, title, isMultiSelect, choices } = p

      if (isMultiSelect) {
        sampleObject[slug] = choices.length > 0 ? choices.slice(0, 2) : ['Option 1', 'Option 2']
      } else if (choices.length > 0) {
        sampleObject[slug] = choices[0]
      } else {
        switch (field.kind) {
          case FieldKindEnum.EMAIL:
            sampleObject[slug] = 'alex@example.com'
            break
          case FieldKindEnum.FULL_NAME:
            sampleObject[slug] = 'Alex Morgan'
            break
          case FieldKindEnum.PHONE_NUMBER:
            sampleObject[slug] = '+1 (555) 123-4567'
            break
          case FieldKindEnum.NUMBER:
          case FieldKindEnum.RATING:
          case FieldKindEnum.OPINION_SCALE:
            sampleObject[slug] = field.properties?.start ?? 10
            break
          case FieldKindEnum.YES_NO:
            sampleObject[slug] = true
            break
          case FieldKindEnum.URL:
            sampleObject[slug] = 'https://example.com'
            break
          case FieldKindEnum.DATE:
          case FieldKindEnum.DATE_RANGE:
            sampleObject[slug] = '2026-10-27'
            break
          case FieldKindEnum.ADDRESS:
            sampleObject[slug] = '123 Market Street, San Francisco, CA'
            break
          case FieldKindEnum.LONG_TEXT:
            sampleObject[slug] = `Detailed response for ${title}`
            break
          case FieldKindEnum.FILE_UPLOAD:
            sampleObject[slug] = 'https://cdn.example.com/attachments/document.pdf'
            break
          default:
            sampleObject[slug] = `Sample ${title}`
            break
        }
      }
    }
  }

  for (const hf of hiddenFields) {
    const name = hf.name || hf.id
    if (name.includes('utm') || name.includes('source')) {
      sampleObject[name] = 'google_campaign'
    } else {
      sampleObject[name] = 'demo_value'
    }
  }

  const jsonPayload = JSON.stringify(sampleObject, null, 2)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `  ${line}`))
    .join('\n')

  return `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${jsonPayload}'`
}

export function generateAllSnippets(options: SnippetGeneratorOptions): SnippetResults {
  return {
    html: generateHtmlSnippet(options),
    nextjs: generateNextJsSnippet(options),
    astro: generateAstroSnippet(options),
    curl: generateCurlSnippet(options)
  }
}
