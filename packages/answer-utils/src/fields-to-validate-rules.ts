import {
  FieldKindEnum,
  FormField,
  Property,
  QUESTION_FIELD_KINDS,
  Validation
} from '@kyndform/shared-types-enums'

import { htmlUtils } from './html-utils'
import { helper } from '@kyndform/utils'

import { getDateFormat } from './helper'

export interface FieldsToValidateRules
  extends FormField, Validation, Partial<Omit<Property, 'choices' | 'tableColumns'>> {
  title: string
  description: string
  choices?: string[]
}

export function fieldsToValidateRules(
  fields: FormField[],
  values?: Record<string, any>
): FieldsToValidateRules[] {
  let rules: FieldsToValidateRules[] = []

  for (const field of fields) {
    if (!QUESTION_FIELD_KINDS.includes(field.kind)) {
      continue
    }

    if (field.kind === FieldKindEnum.GROUP) {
      rules = [...rules, ...(field.properties?.fields || [])?.map(f => convert(f, values, fields))]
    } else {
      rules.push(convert(field, values, fields))
    }
  }

  return rules
}

function convert(
  field: FormField,
  values?: Record<string, any>,
  allFields?: FormField[]
): FieldsToValidateRules {
  let title = (field.title as string) || ''
  let description = (field.description as string) || ''

  if (helper.isValidArray(field.title)) {
    title = htmlUtils.serialize(field.title as unknown as any, {
      plain: true,
      values,
      fields: allFields
    })
  }

  if (helper.isValidArray(field.description)) {
    description = htmlUtils.serialize(field.description as unknown as any, {
      plain: true,
      values,
      fields: allFields
    })
  }

  // Clean raw &nbsp; in titles
  if (typeof title === 'string' && (title.includes('&nbsp;') || title.includes('\u00a0'))) {
    title = title.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ')
  }

  const rule: FieldsToValidateRules = {
    id: field.id,
    kind: field.kind,
    title,
    description,
    validations: field.validations,
    properties: field.properties
  }

  // Validation FieldsToValidateRules
  if (helper.isBool(field.validations?.required)) {
    rule.required = field.validations!.required
  }

  if (
    helper.isValid(field.validations?.min) &&
    helper.isNumeric(String(field.validations?.min), { no_symbols: true })
  ) {
    rule.min = field.validations!.min
  }

  if (
    helper.isValid(field.validations?.max) &&
    helper.isNumeric(String(field.validations?.max), { no_symbols: true })
  ) {
    rule.max = field.validations!.max
  }

  // Choice
  if (helper.isBool(field.properties?.allowMultiple)) {
    rule.allowMultiple = field.properties!.allowMultiple
  }

  if (helper.isBool(field.properties?.allowOther)) {
    rule.allowOther = field.properties!.allowOther
  }

  if (helper.isValidArray(field.properties?.choices)) {
    rule.choices = field.properties!.choices!.map(choice => choice.id)
  }

  // Date format
  if (helper.isString(field.properties?.format)) {
    rule.format = getDateFormat(field.properties!.format!, field.properties?.allowTime)
  }

  // Payment
  if (helper.isNumeric(String(field.properties?.price))) {
    rule.price = field.properties!.price
  }

  // Rating, payment and opinion_scale
  if (
    helper.isValid(field.properties?.total) &&
    helper.isNumeric(String(field.properties?.total), { no_symbols: true })
  ) {
    rule.total = field.properties!.total
  }

  return rule
}
