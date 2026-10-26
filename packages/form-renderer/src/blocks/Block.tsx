import { FieldLayoutAlignEnum, QUESTION_FIELD_KINDS } from '@kyndform/shared-types-enums'
import clsx from 'clsx'
import { FC, WheelEvent, useEffect, useMemo, useRef, useState } from 'react'

import { questionNumber, removeHeading, replaceHTML, useTranslation } from '../utils'
import { htmlUtils } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'

import { Layout } from '../components'
import { useStore } from '../store'
import type { IComponentProps, IFormField } from '../typings'
import { useWheelScroll } from './hook'

export interface BlockProps extends IComponentProps {
  field: IFormField
  paymentBlockIndex?: number
  isScrollable?: boolean
  transitionState?: 'active' | 'leaving'
}

const SPLIT_LAYOUTS = [
  FieldLayoutAlignEnum.FLOAT_LEFT,
  FieldLayoutAlignEnum.FLOAT_RIGHT,
  FieldLayoutAlignEnum.SPLIT_LEFT,
  FieldLayoutAlignEnum.SPLIT_RIGHT
]

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
  if (Array.isArray(value)) {
    return htmlUtils.serialize(sanitizeRichTextNodes(value))
  }

  if (typeof value === 'string') {
    return htmlUtils.serialize(sanitizeRichTextNodes(htmlUtils.parse(value)))
  }

  return ''
}

export const Block: FC<BlockProps> = ({
  className,
  field: rawField,
  paymentBlockIndex,
  isScrollable = true,
  transitionState = 'active',
  children,
  ...restProps
}) => {
  const { state, dispatch } = useStore()
  const { t } = useTranslation()
  const { values, fields, query, variables } = state
  const bodyRef = useRef<HTMLDivElement>(null)

  const field: IFormField = useMemo(
    () => ({
      ...rawField,
      title: sanitizeRichTextHTML(
        replaceHTML(rawField.title as string, values, fields, query, variables)
      ),
      description: sanitizeRichTextHTML(
        replaceHTML(rawField.description as string, values, fields, query, variables)
      )
    }),
    [fields, query, rawField, values, variables]
  )

  const isQuestion = QUESTION_FIELD_KINDS.includes(field.kind)
  const currentQuestionNumber = questionNumber(field.index, field.parent?.index)
  const totalQuestions =
    state.questionCount || state.fields.filter(f => QUESTION_FIELD_KINDS.includes(f.kind)).length
  const isInlineLayout = field.layout?.align === FieldLayoutAlignEnum.INLINE
  const isSplitLayout = SPLIT_LAYOUTS.includes(field.layout?.align as FieldLayoutAlignEnum)
  const imagePosition = field.properties?.imagePosition || 'bottom'
  const imageSize = field.properties?.imageSize || 'medium'
  const align = field.properties?.align

  const titleHtml = useMemo(
    () => (field.title ? removeHeading(field.title as string) : ''),
    [field.title]
  )
  const descriptionHtml = useMemo(
    () => (field.description ? htmlUtils.cleanEmptyBlocks(field.description as string) : ''),
    [field.description]
  )

  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isTransitionReady, setIsTransitionReady] = useState(false)
  const [isScrolledToTop, setIsScrolledToTop] = useState(true)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const activeFieldId = state.fields[state.scrollIndex!]?.id
  const isStandaloneActive =
    (!state.isStarted && state.welcomeField?.id === field.id) || !!state.isSubmitted
  const isLeaving = transitionState === 'leaving'
  const isActiveBlock = !isLeaving && (isStandaloneActive || field.id === activeFieldId)
  const transitionDirection = state.scrollTo === 'previous' ? 'previous' : 'next'

  function handleScroll(event: WheelEvent<HTMLDivElement>) {
    const container = event.target as HTMLElement

    setIsScrolledToTop(container.scrollTop === 0)
    setIsScrolledToBottom(
      container.clientHeight + container.scrollTop + 60 >= container.scrollHeight
    )
  }

  const handleWheelScroll = useWheelScroll(
    isScrollable,
    isScrolledToTop,
    isScrolledToBottom,
    type => {
      dispatch({ type })
    }
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsReducedMotion(false)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsReducedMotion(mediaQuery.matches)

    update()
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(update)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', update)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(update)
      }
    }
  }, [])

  useEffect(() => {
    if (
      helper.isValid(paymentBlockIndex) &&
      paymentBlockIndex !== state.scrollIndex &&
      !isLeaving
    ) {
      setIsTransitionReady(false)
      return
    }

    if (!isActiveBlock && !isLeaving) {
      return
    }

    if (isReducedMotion) {
      setIsTransitionReady(true)
      return
    }

    setIsTransitionReady(false)

    const timeoutId = window.setTimeout(() => {
      setIsTransitionReady(true)
    }, 10)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    isActiveBlock,
    isLeaving,
    isReducedMotion,
    paymentBlockIndex,
    state.scrollIndex,
    state.scrollTo
  ])

  useEffect(() => {
    if (!isActiveBlock || isLeaving) {
      return
    }

    const timeoutId = window.setTimeout(
      () => {
        const container = bodyRef.current

        if (!container) {
          return
        }

        const interactiveElement = container.querySelector<HTMLElement>(
          [
            '[data-kyndform-focus-target]:not([disabled])',
            'input:not([type="hidden"]):not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'button:not([disabled])',
            '[contenteditable="true"]',
            '[tabindex]:not([tabindex="-1"]):not([disabled])'
          ].join(',')
        )

        if (interactiveElement && interactiveElement.offsetParent !== null) {
          try {
            interactiveElement.focus({ preventScroll: true })
          } catch {
            interactiveElement.focus()
          }
          return
        }

        try {
          container.focus({ preventScroll: true })
        } catch {
          container.focus()
        }
      },
      isReducedMotion ? 0 : 1000
    )

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [field.id, isActiveBlock, isLeaving, isReducedMotion, state.scrollIndex])

  return (
    <div
      ref={bodyRef}
      id={`kyndform-${state.instanceId}-${field.id}`}
      className={clsx('kyndform-body', {
        'kyndform-body-split-layout': isSplitLayout,
        'kyndform-body-active': isActiveBlock,
        'kyndform-body-leaving': isLeaving
      })}
      tabIndex={isActiveBlock ? -1 : undefined}
      aria-hidden={!isActiveBlock}
    >
      {/* Theme background */}
      <div className="kyndform-theme-background" />

      {/* Block container */}
      <div
        className={clsx('kyndform-block-container', className)}
        onWheel={handleWheelScroll}
        {...restProps}
      >
        {field.parent && (
          <div className="kyndform-block-group">
            <div className="kyndform-block-group-container">
              <div className="kyndform-block-number">
                {t('Question {{number}}', {
                  number: questionNumber(field.parent!.index)
                })}
              </div>
              <h2 className="kyndform-block-title">
                {htmlUtils.plain(field.parent.title as string)}
              </h2>
            </div>
          </div>
        )}

        <div
          className={clsx('kyndform-block', {
            [`kyndform-block-direction-${transitionDirection}`]: transitionDirection,
            'kyndform-block-entered': isTransitionReady && !isLeaving,
            'kyndform-block-entering': !isTransitionReady && !isLeaving,
            'kyndform-block-leaving': isLeaving,
            'kyndform-block-leaving-active': isTransitionReady && isLeaving,
            'kyndform-block-inactive':
              !isLeaving &&
              !isActiveBlock &&
              !isStandaloneActive &&
              !(helper.isValid(paymentBlockIndex) && paymentBlockIndex === state.scrollIndex),
            [`kyndform-block-${field.layout?.align}`]: field.layout?.align,
            [`kyndform-align-${align}`]: align
          })}
        >
          <div className="kyndform-block-scroll">
            {/* Field layout */}
            {!isInlineLayout && <Layout {...field.layout} />}

            <div className="kyndform-scroll-wrapper" onScroll={handleScroll}>
              <div className="kyndform-scroll-container">
                <div className="kyndform-block-main">
                  <div
                    className={clsx('kyndform-block-wrapper', align && `kyndform-align-${align}`)}
                  >
                    {isInlineLayout && imagePosition === 'top' && (
                      <Layout {...field.layout} className={`kyndform-image-${imageSize}`} />
                    )}

                    <div className="kyndform-block-header">
                      {isQuestion && currentQuestionNumber && (
                        <div
                          className={clsx(
                            'kyndform-block-number',
                            'kyndform-block-number-legacy',
                            `kyndform-block-number-${currentQuestionNumber}`
                          )}
                        >
                          {t('Question {{number}}', {
                            number: currentQuestionNumber
                          })}{' '}
                          {field.validations?.required && <span className="text-red-700">*</span>}
                        </div>
                      )}
                      {(titleHtml || (isQuestion && currentQuestionNumber)) && (
                        <h1 className="kyndform-block-title">
                          {isQuestion && currentQuestionNumber && (
                            <span
                              id={`field-${field.id}-prefix`}
                              aria-label={t('Question {{number}} of {{total}}', {
                                number: currentQuestionNumber,
                                total: totalQuestions
                              })}
                              data-qa="question-header-counter"
                              className="kyndform-block-number-badge"
                            >
                              {currentQuestionNumber}
                            </span>
                          )}
                          {titleHtml && (
                            <span
                              className="kyndform-block-title-content"
                              dangerouslySetInnerHTML={{
                                __html: titleHtml
                              }}
                            />
                          )}
                          {field.validations?.required && (
                            <span
                              className="kyndform-block-required text-red-700"
                              aria-hidden="true"
                            >
                              *
                            </span>
                          )}
                        </h1>
                      )}
                      {isInlineLayout && imagePosition === 'center' && (
                        <Layout {...field.layout} className={`kyndform-image-${imageSize}`} />
                      )}
                      {descriptionHtml && (
                        <div
                          className="kyndform-block-description"
                          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                        />
                      )}
                    </div>

                    {isInlineLayout && imagePosition === 'bottom' && (
                      <Layout {...field.layout} className={`kyndform-image-${imageSize}`} />
                    )}

                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
