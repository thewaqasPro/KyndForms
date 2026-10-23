import {
  Answer,
  FieldKindEnum,
  FormField,
  HiddenField,
  STATEMENT_FIELD_KINDS
} from '@kyndform/shared-types-enums'
import { Injectable } from '@nestjs/common'
import { FieldInfo, parseAsync } from 'json2csv'

import { htmlUtils, parsePlainAnswer } from '@kyndform/answer-utils'
import { helper, unixDate } from '@kyndform/utils'
import { SubmissionModel } from '@model'

const FIELD_ID_KEY = '#'
const START_DATE_KEY = 'Start Date (UTC)'
const SUBMIT_DATE_KEY = 'Submit Date (UTC)'
const SPREADSHEET_FORMULA_PREFIXES = new Set(['=', '+', '-', '@'])

function neutralizeSpreadsheetFormula(value: string): string {
  let index = 0

  while (index < value.length) {
    const character = value[index]
    const code = character.charCodeAt(0)
    const isControlCharacter = code <= 0x1f || (code >= 0x7f && code <= 0x9f)

    if (!isControlCharacter && character.trim() !== '') {
      break
    }

    index += 1
  }

  if (SPREADSHEET_FORMULA_PREFIXES.has(value[index])) {
    return `'${value}`
  }

  return value
}

@Injectable()
export class ExportFileService {
  async csv(
    formFields: FormField[],
    selectedHiddenFields: HiddenField[],
    submissions: SubmissionModel[]
  ): Promise<string> {
    const selectedFormFields = formFields
      .filter(field => !STATEMENT_FIELD_KINDS.includes(field.kind))
      .map(field => ({
        ...field,
        title: neutralizeSpreadsheetFormula(
          helper.isArray(field.title) ? htmlUtils.serialize(field.title) : String(field.title || '')
        )
      }))

    const knownAnswerIds = new Set(selectedFormFields.map(field => field.id))
    const knownHiddenIds = new Set(selectedHiddenFields.map(hiddenField => hiddenField.id))

    const extraAnswerFields: { id: string; label: string }[] = []
    const seenExtraAnswerIds = new Set<string>()

    const extraHiddenFields: { id: string; label: string }[] = []
    const seenExtraHiddenIds = new Set<string>()

    for (const submission of submissions) {
      for (const answer of submission.answers || []) {
        if (answer?.id && !knownAnswerIds.has(answer.id) && !seenExtraAnswerIds.has(answer.id)) {
          seenExtraAnswerIds.add(answer.id)
          const rawTitle = answer.title || answer.id
          extraAnswerFields.push({
            id: answer.id,
            label: neutralizeSpreadsheetFormula(
              helper.isArray(rawTitle)
                ? htmlUtils.serialize(rawTitle as any)
                : String(rawTitle || '')
            )
          })
        }
      }
      for (const hf of submission.hiddenFields || []) {
        if (hf?.id && !knownHiddenIds.has(hf.id) && !seenExtraHiddenIds.has(hf.id)) {
          seenExtraHiddenIds.add(hf.id)
          const rawName = hf.name || hf.id
          extraHiddenFields.push({
            id: hf.id,
            label: neutralizeSpreadsheetFormula(String(rawName || ''))
          })
        }
      }
    }

    const fields: FieldInfo<SubmissionModel>[] = [
      {
        label: FIELD_ID_KEY,
        value: submission => submission.id
      },
      ...selectedFormFields.map(field => ({
        label: field.title,
        value: (submission: SubmissionModel) => {
          const answer = submission.answers?.find(answer => answer.id === field.id)

          return helper.isEmpty(answer)
            ? ''
            : neutralizeSpreadsheetFormula(this.parseAnswer(answer))
        }
      })),
      ...extraAnswerFields.map(field => ({
        label: field.label,
        value: (submission: SubmissionModel) => {
          const answer = submission.answers?.find(answer => answer.id === field.id)

          return helper.isEmpty(answer)
            ? ''
            : neutralizeSpreadsheetFormula(this.parseAnswer(answer))
        }
      })),
      ...selectedHiddenFields.map(hiddenField => ({
        label: neutralizeSpreadsheetFormula(hiddenField.name),
        value: (submission: SubmissionModel) => {
          const value = submission.hiddenFields?.find(answer => answer.id === hiddenField.id)?.value

          return helper.isString(value) ? neutralizeSpreadsheetFormula(value) : (value ?? '')
        }
      })),
      ...extraHiddenFields.map(hiddenField => ({
        label: hiddenField.label,
        value: (submission: SubmissionModel) => {
          const value = submission.hiddenFields?.find(answer => answer.id === hiddenField.id)?.value

          return helper.isString(value) ? neutralizeSpreadsheetFormula(value) : (value ?? '')
        }
      })),
      {
        label: START_DATE_KEY,
        value: submission => (submission.startAt ? unixDate(submission.startAt).toISOString() : '')
      },
      {
        label: SUBMIT_DATE_KEY,
        value: submission => (submission.startAt ? unixDate(submission.endAt!).toISOString() : '')
      }
    ]

    return parseAsync(submissions, {
      fields
    })
  }

  private parseAnswer(answer: Answer): string {
    const value = answer.value
    let result = ''

    if (helper.isEmpty(value)) {
      return result
    }

    switch (answer?.kind) {
      case FieldKindEnum.FILE_UPLOAD:
        if (helper.isString(value)) {
          result = value
        } else if (helper.isObject(value)) {
          if (helper.isString(value.url)) {
            result = value.url
          } else {
            const prefix = value.urlPrefix || value.cdnUrlPrefix
            const key = value.key || value.cdnKey

            if (helper.isString(prefix) && helper.isString(key)) {
              result = `${prefix.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`
            }
          }
        }
        break

      default:
        try {
          result = parsePlainAnswer(answer)
        } catch {
          // Historical submissions may predate current validation. Treat a malformed answer as
          // an empty cell so one poisoned record cannot make the entire form unexportable.
          result = ''
        }
        break
    }

    return result
  }
}
