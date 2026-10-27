import { Answer, FieldKindEnum } from '@kyndform/shared-types-enums'

import parser from './answer-parser'
import { parsePlainAnswer } from './answer-to-plain'
import { escapeHtmlText } from './escape-html'

const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSION_REGEX.test(url)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function formatQuestionTitle(title: string | undefined, allAnswers?: Answer[]): string {
  if (!title) {
    return 'Question'
  }

  let text = String(title)
  let hadMention = false

  // 1. Resolve HTML mention spans: <span ... data-mention="id">...</span>
  if (text.includes('data-mention')) {
    text = text.replace(
      /<span[^>]+data-mention="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi,
      (_, fieldId) => {
        hadMention = true
        if (allAnswers && allAnswers.length > 0) {
          const found = allAnswers.find(a => a.id === fieldId)
          if (found) {
            const val = parsePlainAnswer(found, true)
            if (val && val.trim()) {
              return val.trim()
            }
          }
        }
        return ''
      }
    )
  }

  // 1b. Resolve HTML hiddenfield and variable spans
  if (text.includes('data-hiddenfield')) {
    text = text.replace(
      /<span[^>]+data-hiddenfield="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi,
      (_, fieldId) => {
        hadMention = true
        if (allAnswers && allAnswers.length > 0) {
          const found = allAnswers.find(a => a.id === fieldId)
          if (found) {
            const val = parsePlainAnswer(found, true)
            if (val && val.trim()) return val.trim()
          }
        }
        return ''
      }
    )
  }

  if (text.includes('data-variable')) {
    text = text.replace(
      /<span[^>]+data-variable="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi,
      (_, varId) => {
        hadMention = true
        if (allAnswers && allAnswers.length > 0) {
          const found = allAnswers.find(a => a.id === varId)
          if (found) {
            const val = parsePlainAnswer(found, true)
            if (val && val.trim()) return val.trim()
          }
        }
        return ''
      }
    )
  }

  // 2. Resolve plain text mentions: e.g. "@Find The Perfect Engagement Ring For Your Style"
  // When titles were serialized with { plain: true }, mentions became "@<Original Question Title>"
  if (allAnswers && allAnswers.length > 0 && text.includes('@')) {
    const sortedAnswers = [...allAnswers]
      .filter(a => a.title && a.title.trim().length > 1)
      .sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))

    for (const ans of sortedAnswers) {
      const cleanAnsTitle = ans
        .title!.replace(/&nbsp;/gi, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()

      if (cleanAnsTitle.length > 1) {
        const mentionPattern = new RegExp('@' + escapeRegex(cleanAnsTitle), 'gi')
        if (mentionPattern.test(text)) {
          hadMention = true
          const val = parsePlainAnswer(ans, true)
          const replacement = val && val.trim() ? val.trim() : ''
          text = text.replace(mentionPattern, replacement)
        }
      }
    }
  }

  // 3. Clean &nbsp; and \u00a0
  if (text.includes('&nbsp;') || text.includes('\u00a0')) {
    text = text.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ')
  }

  // 4. If the title had a mention, clean formatting asterisks, stray tags, and leftover punctuation
  if (hadMention) {
    text = text
      .replace(/\*+/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^[,.\s]+/, '')
      .trim()
  }

  return text || 'Question'
}

function extractChoiceLabels(answer: Answer): string[] {
  const choices = (answer.properties?.choices || []) as Array<{ id: string; label: string }>
  const choiceMap = new Map<string, string>()
  for (const c of choices) {
    if (c?.id) {
      choiceMap.set(c.id, c.label ?? '')
    }
  }

  const result: string[] = []

  if (Array.isArray(answer.value)) {
    for (const item of answer.value) {
      if (typeof item === 'string' && choiceMap.has(item)) {
        result.push(choiceMap.get(item)!)
      } else if (item !== undefined && item !== null && item !== '') {
        result.push(String(item))
      }
    }
  } else if (typeof answer.value === 'object' && answer.value !== null) {
    if (Array.isArray(answer.value.value)) {
      for (const item of answer.value.value) {
        if (typeof item === 'string' && choiceMap.has(item)) {
          result.push(choiceMap.get(item)!)
        } else if (item !== undefined && item !== null && item !== '') {
          result.push(String(item))
        }
      }
    }
    if (
      answer.value.other !== undefined &&
      answer.value.other !== null &&
      String(answer.value.other).trim() !== ''
    ) {
      result.push(String(answer.value.other).trim())
    }
  } else if (typeof answer.value === 'string' && answer.value.trim() !== '') {
    if (choiceMap.has(answer.value)) {
      result.push(choiceMap.get(answer.value)!)
    } else {
      result.push(answer.value)
    }
  }

  return result
}

export function answersToHtml(answers: Answer[]): string {
  if (!Array.isArray(answers) || answers.length === 0) {
    return '<p style="color: #94a3b8; font-style: italic; margin: 0;">No answers submitted.</p>'
  }

  const rows = answers
    .map(answer => {
      const valueHtml = renderAnswerHtml(answer)
      const title = formatQuestionTitle(answer.title, answers)

      return `
<tr>
  <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 5px;">
      ${escapeHtmlText(title)}
    </div>
    <div style="font-size: 14px; color: #0f172a; line-height: 1.5;">
      ${valueHtml}
    </div>
  </td>
</tr>`
    })
    .join('')

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; border-spacing: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${rows}</table>`
}

function renderAnswerHtml(answer: Answer): string {
  if (answer.value === undefined || answer.value === null || answer.value === '') {
    return '<span style="color: #94a3b8; font-style: italic;">No response</span>'
  }

  try {
    switch (answer.kind) {
      case FieldKindEnum.FILE_UPLOAD: {
        const file = parser.fileUpload(answer)
        if (!file?.url || !/^https?:\/\//i.test(file.url)) {
          return `<span style="color: #0f172a;">${escapeHtmlText(file?.filename || '')}</span>`
        }

        const isImg = isImageUrl(file.url)
        const filename = file.filename || 'Download Attachment'

        if (isImg) {
          return `
<div style="margin-top: 4px;">
  <div style="margin-bottom: 8px;">
    <a href="${escapeHtmlText(file.url)}" target="_blank" style="display: inline-block; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background-color: #f8fafc; text-decoration: none;">
      <img src="${escapeHtmlText(file.url)}" alt="${escapeHtmlText(filename)}" style="max-width: 100%; max-height: 160px; border-radius: 6px; display: block;" />
    </a>
  </div>
  <a href="${escapeHtmlText(file.url)}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; letter-spacing: 0.2px;">
    📎 Download ${escapeHtmlText(filename)} &nbsp; &darr;
  </a>
</div>`
        }

        return `
<div style="margin-top: 4px;">
  <a href="${escapeHtmlText(file.url)}" target="_blank" style="display: inline-block; padding: 9px 18px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; letter-spacing: 0.2px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
    📎 Download ${escapeHtmlText(filename)} &rarr;
  </a>
</div>`
      }

      case FieldKindEnum.SIGNATURE: {
        const signatureUrl =
          typeof answer.value === 'string' ? answer.value : answer.value?.url || ''
        const isSafeSignature =
          typeof signatureUrl === 'string' &&
          (/^https?:\/\//i.test(signatureUrl) || signatureUrl.startsWith('data:image/png;base64,'))
        if (!signatureUrl || !isSafeSignature) {
          return '<span style="color: #94a3b8; font-style: italic;">No signature</span>'
        }

        return `
<div style="margin-top: 4px;">
  <div style="display: inline-block; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px;">
    <img src="${escapeHtmlText(signatureUrl)}" alt="Signature" style="max-height: 70px; max-width: 240px; object-fit: contain; display: block;" />
  </div>
</div>`
      }

      case FieldKindEnum.EMAIL: {
        const email = String(answer.value).trim()
        return `<a href="mailto:${escapeHtmlText(email)}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${escapeHtmlText(email)}</a>`
      }

      case FieldKindEnum.PHONE_NUMBER: {
        const phone = String(answer.value).trim()
        return `<a href="tel:${escapeHtmlText(phone)}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${escapeHtmlText(phone)}</a>`
      }

      case FieldKindEnum.URL: {
        const url = String(answer.value).trim()
        const isSafeScheme = /^https?:\/\//i.test(url)
        if (!isSafeScheme) {
          return `<span style="color: #0f172a; word-break: break-all;">${escapeHtmlText(url)}</span>`
        }
        return `<a href="${escapeHtmlText(url)}" target="_blank" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${escapeHtmlText(url)}</a>`
      }

      case FieldKindEnum.FULL_NAME: {
        const name = parser.fullName(answer)
        const full =
          `${name.firstName || ''} ${name.lastName || ''}`.trim() || String(answer.value || '')
        return `<span style="font-weight: 500; color: #0f172a;">${escapeHtmlText(full)}</span>`
      }

      case FieldKindEnum.MULTIPLE_CHOICE:
      case FieldKindEnum.PICTURE_CHOICE: {
        const choices = extractChoiceLabels(answer)

        if (choices.length > 0) {
          const badges = choices
            .map(
              c =>
                `<span style="display: inline-block; padding: 4px 10px; margin: 2px 6px 2px 0; background-color: #f1f5f9; color: #334155; border-radius: 9999px; font-size: 12px; font-weight: 500; border: 1px solid #e2e8f0;">${escapeHtmlText(c)}</span>`
            )
            .join('')
          return `<div style="margin-top: 2px;">${badges}</div>`
        }
        return escapeHtmlText(String(answer.value ?? ''))
      }

      case FieldKindEnum.YES_NO:
      case FieldKindEnum.LEGAL_TERMS: {
        const isYes =
          answer.value === true ||
          answer.value === 'true' ||
          answer.value === 'Yes' ||
          answer.value === 1 ||
          answer.value === '1'
        const label = isYes ? '✓ Yes' : '✗ No'
        const bg = isYes ? '#dcfce7' : '#fee2e2'
        const color = isYes ? '#166534' : '#991b1b'

        return `<span style="display: inline-block; padding: 3px 10px; background-color: ${bg}; color: ${color}; border-radius: 9999px; font-size: 12px; font-weight: 600;">${label}</span>`
      }

      case FieldKindEnum.RATING:
      case FieldKindEnum.OPINION_SCALE: {
        const rating = parser.rating(answer)
        return `<span style="display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #92400e; border-radius: 6px; font-weight: 700; font-size: 13px;">★ ${escapeHtmlText(String(rating))}</span>`
      }

      case FieldKindEnum.LONG_TEXT: {
        const text = String(answer.value)
        return `<div style="white-space: pre-wrap; background-color: #f8fafc; padding: 12px 14px; border-left: 3px solid #cbd5e1; border-radius: 4px; color: #334155; font-size: 14px; line-height: 1.6;">${escapeHtmlText(text)}</div>`
      }

      case FieldKindEnum.ADDRESS: {
        const addr = parser.address(answer)
        return `<span style="color: #0f172a;">${escapeHtmlText(addr)}</span>`
      }

      case FieldKindEnum.DATE_RANGE: {
        const range = parser.dateRange(answer)
        return `<span style="color: #0f172a; font-weight: 500;">${escapeHtmlText(range)}</span>`
      }

      case FieldKindEnum.INPUT_TABLE: {
        const tableStr = parser.inputTable(answer)
        return `<pre style="font-family: inherit; margin: 0; white-space: pre-wrap; font-size: 13px; color: #334155;">${escapeHtmlText(tableStr)}</pre>`
      }

      case FieldKindEnum.PAYMENT: {
        const p = parser.payment(answer)
        return `<span style="display: inline-block; padding: 3px 10px; background-color: #dcfce7; color: #166534; border-radius: 6px; font-weight: 600; font-size: 13px;">💳 ${escapeHtmlText(p)}</span>`
      }

      default: {
        if (Array.isArray(answer.value)) {
          return escapeHtmlText(answer.value.join(', '))
        }
        if (typeof answer.value === 'object') {
          return escapeHtmlText(
            Object.entries(answer.value)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          )
        }
        if (typeof answer.value === 'boolean') {
          return answer.value ? 'Yes' : 'No'
        }
        return escapeHtmlText(String(answer.value ?? ''))
      }
    }
  } catch (_) {
    return escapeHtmlText(
      typeof answer.value === 'object' ? JSON.stringify(answer.value) : String(answer.value)
    )
  }
}
