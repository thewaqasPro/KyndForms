import { questionNumber } from '@kyndform/form-renderer'
import { FieldLayoutAlignEnum, QUESTION_FIELD_KINDS } from '@kyndform/shared-types-enums'
import type { FC } from 'react'
import { RefObject, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/utils'
import { htmlUtils } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'

import { FormFieldType } from '@/types'

import { RichText } from '../../RichText'
import { useStoreContext } from '../../store'
import { Layout } from '../Layout'

const ALLOWED_BLOCK_TAGS = ['div', 'h1', 'h2', 'h3', 'p', 'br']
const ALLOWED_TAGS = [
  'text',
  'span',
  'bold',
  'strong',
  'code',
  'a',
  'b',
  'i',
  'u',
  's',
  'mention',
  'variable',
  'hiddenfield',
  ...ALLOWED_BLOCK_TAGS
]
const ALLOWED_ATTRIBUTES = [
  'href',
  'class',
  'style',
  'align',
  'data-mention',
  'data-variable',
  'data-hiddenfield',
  'contenteditable',
  'id'
]
const UNSAFE_URL_PROTOCOLS = new Set(['javascript', 'vbscript', 'data'])
const URL_PROTOCOL_CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f\s]+/g

function isUnsafeUrlProtocol(value: unknown): boolean {
  const matched = String(value || '')
    .trimStart()
    .match(/^([^:]+):/)

  if (!matched) {
    return false
  }

  const protocol = matched[1].replace(URL_PROTOCOL_CONTROL_CHARS_REGEX, '').toLowerCase()
  return UNSAFE_URL_PROTOCOLS.has(protocol)
}

function escapeText(value: unknown): string {
  return String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeAttributes(attributes: Record<string, any> = {}): Record<string, string> {
  const result: Record<string, string> = {}

  for (const key of Object.keys(attributes)) {
    if (!ALLOWED_ATTRIBUTES.includes(key)) {
      continue
    }

    const value = String(attributes[key] || '')

    if (key === 'href' && isUnsafeUrlProtocol(value)) {
      continue
    }

    if (key === 'style') {
      const parts = value.split(';')
      const safe: string[] = []
      for (const p of parts) {
        const [prop, v] = p.split(':').map(s => s.trim().toLowerCase())
        if (prop === 'text-align' && ['left', 'center', 'right', 'justify'].includes(v)) {
          safe.push(`text-align: ${v};`)
        }
      }
      if (safe.length > 0) {
        result[key] = escapeAttribute(safe.join(' '))
      }
      continue
    }

    if (key === 'align') {
      const v = value.trim().toLowerCase()
      if (['left', 'center', 'right', 'justify'].includes(v)) {
        result[key] = escapeAttribute(v)
      }
      continue
    }

    result[key] = escapeAttribute(value)
  }

  return result
}

function sanitizeRichTextNode(node: unknown): any[] | string | undefined {
  if (typeof node === 'string') {
    return escapeText(node)
  }

  if (!Array.isArray(node)) {
    return
  }

  const [tag, body, attributes] = node

  if (!ALLOWED_TAGS.includes(tag)) {
    return
  }

  const sanitizedBody = Array.isArray(body) ? body.map(sanitizeRichTextNode).filter(Boolean) : []
  const sanitizedAttributes = sanitizeAttributes(attributes)
  const sanitizedNode: any[] = [tag]

  if (sanitizedBody.length > 0) {
    sanitizedNode.push(sanitizedBody)
  }

  if (Object.keys(sanitizedAttributes).length > 0) {
    if (sanitizedBody.length < 1) {
      sanitizedNode.push([])
    }

    sanitizedNode.push(sanitizedAttributes)
  }

  return sanitizedNode
}

function sanitizeRichTextNodes(nodes: unknown[]): any[] {
  return nodes.map(sanitizeRichTextNode).filter(Boolean)
}

function sanitizeRichTextHTML(value: unknown): string {
  if (!value) {
    return ''
  }

  let result = ''

  if (Array.isArray(value)) {
    result = htmlUtils.serialize(sanitizeRichTextNodes(value))
  } else if (typeof value === 'string') {
    result = htmlUtils.serialize(sanitizeRichTextNodes(htmlUtils.parse(value)))
  }

  if (
    !htmlUtils.plain(result).trim() &&
    !/<(img|span[^>]*data-(mention|variable|hiddenfield))/i.test(result)
  ) {
    return ''
  }

  return htmlUtils.cleanEmptyBlocks(result)
}

export interface BlockProps extends ComponentProps {
  field: FormFieldType
  locale: string
  parentField?: FormFieldType
}

export const Block: FC<BlockProps> = ({
  className,
  field,
  locale,
  parentField,
  children,
  ...restProps
}) => {
  const { dispatch } = useStoreContext()
  const { t } = useTranslation()

  const titleRef = useRef<HTMLDivElement>(undefined)
  const descriptionRef = useRef<HTMLDivElement>(undefined)

  const isLabelShow = QUESTION_FIELD_KINDS.includes(field.kind)
  const isCoverShow = helper.isValid(field.layout?.mediaUrl)
  const isImageCover = helper.isURL(field.layout?.mediaUrl)

  function handleTitleChange(title: string) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          title: htmlUtils.cleanEmptyBlocks(title)
        }
      }
    })
  }

  function handleDescriptionChange(description: string) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          description: htmlUtils.cleanEmptyBlocks(description)
        }
      }
    })
  }

  const handleTitleChangeCallback = useCallback(handleTitleChange, [field.id])
  const handleDescriptionChangeCallback = useCallback(handleDescriptionChange, [field.id])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current!.innerHTML = sanitizeRichTextHTML(field.title)
    }

    if (descriptionRef.current) {
      descriptionRef.current!.innerHTML = sanitizeRichTextHTML(field.description)
    }
  }, [field.id])

  return (
    <>
      <div className="kyndform-theme-background" />

      {field.layout?.align !== FieldLayoutAlignEnum.INLINE && (
        <Layout className={`kyndform-layout-${field.layout?.align}`} layout={field.layout} />
      )}

      {parentField && (
        <div className="kyndform-block-group rounded-t-lg">
          <div className="kyndform-block-group-container">
            <label className="kyndform-block-number">
              {t('Question {{number}}', {
                number: questionNumber(parentField!.index),
                lng: locale
              })}
            </label>
            <div className="kyndform-block-title">
              {htmlUtils.plain(parentField.title as string)}
            </div>
          </div>
        </div>
      )}

      <div
        className={cn('kyndform-block-container', {
          [`kyndform-block-${field.layout?.align}`]: field.layout?.align
        })}
      >
        <div className="flex min-h-full flex-col items-center justify-center">
          <div className={cn('kyndform-block', className)} {...restProps}>
            <div className="mb-10">
              {isLabelShow && (
                <label className="kyndform-block-number">
                  {t('Question {{number}}', {
                    number: questionNumber(field.index, parentField?.index),
                    lng: locale
                  })}{' '}
                  {field.validations?.required && <span className="text-error">*</span>}
                </label>
              )}
              <RichText
                className="kyndform-block-title"
                innerRef={titleRef as RefObject<HTMLDivElement>}
                placeholder={t('form.builder.compose.question')}
                onChange={handleTitleChangeCallback}
              />
              <RichText
                className="kyndform-block-description"
                innerRef={descriptionRef as RefObject<HTMLDivElement>}
                placeholder={t('form.builder.compose.description')}
                onChange={handleDescriptionChangeCallback}
              />
            </div>

            {isCoverShow && field.layout?.align === FieldLayoutAlignEnum.INLINE && (
              <div className="kyndform-block-image">
                {isImageCover ? (
                  <img src={field.layout?.mediaUrl} />
                ) : (
                  <div
                    style={{
                      backgroundImage: field.layout?.mediaUrl
                    }}
                  ></div>
                )}
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </>
  )
}
