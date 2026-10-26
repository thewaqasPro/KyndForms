import { parse as html5Parse } from 'html5parser'
import { IAttribute } from 'html5parser/src/types'

import { helper, htmlToText } from '@kyndform/utils'

interface HTMLWalkOptions {
  allowedTags?: string[]
  allowedBlockTags?: string[]
  allowedAttributes?: string[]
  plain?: boolean
  livePreview?: boolean
}

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
  'hiddenfield'
]
const ALLOWED_ATTRIBUTES = [
  'href',
  'class',
  'style',
  'align',
  'data-mention',
  'data-variable',
  'data-hiddenfield',
  'contenteditable'
]

const UNSAFE_URL_PROTOCOLS = new Set(['javascript', 'vbscript', 'data'])
const URL_PROTOCOL_CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f\s]+/g

export function isUnsafeUrlProtocol(value: unknown): boolean {
  const matched = String(value || '')
    .trimStart()
    .match(/^([^:]+):/)

  if (!matched) {
    return false
  }

  const protocol = matched[1].replace(URL_PROTOCOL_CONTROL_CHARS_REGEX, '').toLowerCase()
  return UNSAFE_URL_PROTOCOLS.has(protocol)
}

function sanitizeStyle(styleString: unknown): string | undefined {
  if (typeof styleString !== 'string') return undefined
  const safeDeclarations: string[] = []
  const declarations = styleString.split(';')
  for (const decl of declarations) {
    const parts = decl.split(':')
    if (parts.length === 2) {
      const property = parts[0].trim().toLowerCase()
      const val = parts[1].trim().toLowerCase()
      if (property === 'text-align' && ['left', 'center', 'right', 'justify'].includes(val)) {
        safeDeclarations.push(`text-align: ${val};`)
      }
    }
  }
  return safeDeclarations.length > 0 ? safeDeclarations.join(' ') : undefined
}

function sanitizeAlign(alignString: unknown): string | undefined {
  if (typeof alignString !== 'string') return undefined
  const val = alignString.trim().toLowerCase()
  if (['left', 'center', 'right', 'justify'].includes(val)) {
    return val
  }
  return undefined
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

function getAttributes(row: IAttribute[], allowedAttributes: string[] = []): Record<string, any> {
  const result: Record<string, any> = {}

  if (helper.isValidArray(row)) {
    row.forEach(a => {
      const name = a.name.value.toLowerCase()
      const value = a.value?.value

      if (allowedAttributes.includes(name)) {
        if (name === 'href' && helper.isValid(value) && isUnsafeUrlProtocol(value)) {
          return
        }

        if (name === 'style') {
          const safeStyle = sanitizeStyle(value)
          if (safeStyle) {
            result[name] = safeStyle
          }
          return
        }

        if (name === 'align') {
          const safeAlign = sanitizeAlign(value)
          if (safeAlign) {
            result[name] = safeAlign
          }
          return
        }

        result[name] = value
      }
    })
  }

  return result
}

function walk(node: any, option: HTMLWalkOptions): any[] | string | undefined {
  let tag = (node.name || node.type).toLowerCase()
  const allowedTags = option.allowedTags!.concat(option.allowedBlockTags || ALLOWED_BLOCK_TAGS)

  if (allowedTags.includes(tag)) {
    const text = node.value

    if (tag === 'text') {
      return text
    }

    let attributes = getAttributes(node.attributes, option.allowedAttributes)

    if (tag === 'span') {
      const mentionId = attributes['data-mention']
      const variableId = attributes['data-variable']

      if (helper.isValid(mentionId)) {
        tag = 'mention'
        attributes = {
          id: mentionId
        }
      } else if (helper.isValid(variableId)) {
        tag = 'variable'
        attributes = {
          id: variableId
        }
      }
    }

    const schema: any[] = [tag]

    if (helper.isValidArray(node.body)) {
      const body = node.body!.map((child: any) => walk(child, option))

      if (helper.isValidArray(body)) {
        schema.push(body)
      }
    }

    if (helper.isValid(attributes)) {
      schema.push(attributes)
    }

    return schema
  }
}

// Purge illegal html tag and attributes
function purge(html: string, option?: HTMLWalkOptions): string {
  const schemas = parse(html, option)
  return serialize(schemas, option)
}

// HTML string to schema
function parse(html: string, option?: HTMLWalkOptions): any[] {
  if (helper.isEmpty(html)) {
    return []
  }

  const result = html5Parse(html)
  const customOption: HTMLWalkOptions = {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    ...option
  }

  return result.map((node: any) => walk(node, customOption)).filter(Boolean)
}

// HTML schema to HTML string
function serialize(schemas?: any[], option?: HTMLWalkOptions): string {
  if (!helper.isValidArray(schemas)) {
    return ''
  }

  const customOption: HTMLWalkOptions = {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    ...option
  }

  const allowedTags = customOption.allowedTags!.concat(
    customOption.allowedBlockTags || ALLOWED_BLOCK_TAGS
  )

  return schemas!
    .map(schema => {
      if (helper.isString(schema)) {
        return escapeText(schema)
      }

      if (!helper.isValidArray(schema)) {
        return ''
      }

      let [tag, body, attributes] = schema

      if (
        !allowedTags.includes(tag) ||
        // Only allows empty br node
        (helper.isEmpty(body) && helper.isEmpty(attributes) && tag !== 'br')
      ) {
        return ''
      }

      if (customOption.plain) {
        return serialize(body!, customOption)
      }

      if (tag === 'br') {
        return '<br />'
      }

      let property = ''

      if (helper.isValid(attributes)) {
        if (tag === 'mention') {
          attributes = {
            class: 'mention',
            contenteditable: 'false',
            'data-mention': attributes.id
          }
        } else if (tag === 'variable') {
          attributes = {
            class: 'variable',
            contenteditable: 'false',
            'data-variable': attributes.id
          }
        } else if (tag === 'a') {
          attributes.target = '_blank'
          attributes.rel = 'noreferrer'
        }

        property = Object.keys(attributes!)
          .filter(key => customOption.allowedAttributes!.includes(key))
          .filter(key => key !== 'href' || !isUnsafeUrlProtocol(attributes![key]))
          .map(key => {
            if (key === 'style') {
              const safeStyle = sanitizeStyle(attributes![key])
              return safeStyle ? ` style="${escapeAttribute(safeStyle)}"` : ''
            }
            if (key === 'align') {
              const safeAlign = sanitizeAlign(attributes![key])
              return safeAlign ? ` align="${escapeAttribute(safeAlign)}"` : ''
            }
            return ` ${key}="${escapeAttribute(attributes![key])}"`
          })
          .join('')
      }

      if (tag === 'mention' || tag === 'variable') {
        tag = 'span'

        // Placeholder for live preview
        if (customOption.livePreview) {
          body = ['_____']
        }
      }

      return `<${tag}${property}>${serialize(body!, customOption)}</${tag}>`
    })
    .join('')
}

// HTML to plain text
function plain(html: string, limit = 0) {
  if (helper.isEmpty(html)) {
    return ''
  }

  const result = htmlToText(html, 0)

  if (limit > 0) {
    let sliced = result.slice(0, limit)

    if (result.length > limit) {
      sliced += '...'
    }

    return sliced
  }

  return result
}

// Strip leading/trailing empty HTML blocks (div, p, span containing only br, nbsp, or whitespace)
function cleanEmptyBlocks(html?: string): string {
  if (!html) {
    return ''
  }

  let result = String(html)
  const emptyElemRegex = /<(div|p|span)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi
  const trailingRegex = /(?:<br\s*\/?>|&nbsp;|\s)+$/gi
  const leadingRegex = /^(?:<br\s*\/?>|&nbsp;|\s)+/gi

  let prev = ''
  while (prev !== result) {
    prev = result
    result = result.replace(emptyElemRegex, '')
    result = result.replace(trailingRegex, '')
    result = result.replace(leadingRegex, '')
  }

  return result
}

export const htmlUtils = {
  parse,
  serialize,
  purge,
  plain,
  cleanEmptyBlocks
}
