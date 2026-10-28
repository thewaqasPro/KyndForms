import { FieldKindEnum } from '@kyndform/shared-types-enums'
import { FC, useState } from 'react'

import { removeHeading, useTranslation } from '../../utils'
import { ValidateError, htmlUtils, validateFields } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'

import { ThankYou } from '../../blocks/ThankYou'
import { useStore } from '../../store'
import { ClassicField } from './ClassicField'

export const ClassicForm: FC = () => {
  const { state, dispatch } = useStore()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string>()

  const visibleFields = (state.fields || []).filter(
    f => f.kind !== FieldKindEnum.WELCOME && f.kind !== FieldKindEnum.THANK_YOU
  )

  const welcomeField = state.welcomeField
  const rawTitle = welcomeField?.title
    ? Array.isArray(welcomeField.title)
      ? htmlUtils.serialize(welcomeField.title)
      : (welcomeField.title as string)
    : undefined
  const formTitle = rawTitle ? removeHeading(rawTitle) : undefined

  const rawDescription = welcomeField?.description
    ? Array.isArray(welcomeField.description)
      ? htmlUtils.serialize(welcomeField.description)
      : (welcomeField.description as string)
    : undefined
  const formDescription = rawDescription ? htmlUtils.cleanEmptyBlocks(rawDescription) : undefined

  function handleFieldChange(fieldId: string, value: any) {
    dispatch({
      type: 'setValues',
      payload: {
        values: {
          [fieldId]: value
        }
      }
    })

    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  function validateAll(): Record<string, string> {
    const errors: Record<string, string> = {}

    try {
      validateFields(visibleFields, state.values)
    } catch (err: any) {
      if (err instanceof ValidateError || err?.response?.id) {
        const id = err.response?.id || err.id
        errors[id] = err.response?.message || err.message || t('This field is required')
      }
    }

    for (const f of visibleFields) {
      if (f.validations?.required && helper.isEmpty(state.values[f.id])) {
        if (!errors[f.id]) {
          errors[f.id] = t('This field is required')
        }
      }
    }

    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(undefined)

    const errors = validateAll()
    setFieldErrors(errors)

    const errorFieldIds = Object.keys(errors)
    if (errorFieldIds.length > 0) {
      const firstId = errorFieldIds[0]
      const el = document.getElementById(`field-${firstId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    if (loading) return
    setLoading(true)

    try {
      if (state.onSubmit) {
        await state.onSubmit(state.values, false, state.stripe)
      }
      dispatch({
        type: 'setIsSubmitted',
        payload: {
          isSubmitted: true,
          thankYouFieldId: state.thankYouFields?.[0]?.id
        }
      })
    } catch (err: any) {
      setSubmitError(err?.message || t('Failed to submit form. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (state.isSubmitted) {
    const thankYouField = state.thankYouFields?.find(f => f.id === state.thankYouFieldId)
    const field: any = thankYouField || {
      title: t('Thank you!'),
      description: t('Thanks for completing this form. Now create your own form.'),
      properties: {
        buttonText: t('Create a kyndform')
      }
    }
    return <ThankYou field={field} />
  }

  return (
    <div className="kyndform-classic-root">
      <div className="kyndform-classic-card">
        {(state.logo || formTitle || formDescription) && (
          <div className="kyndform-classic-header">
            {state.logo && <img src={state.logo} alt="Logo" className="kyndform-classic-logo" />}
            {formTitle && (
              <h1
                className="kyndform-classic-title"
                dangerouslySetInnerHTML={{ __html: formTitle }}
              />
            )}
            {formDescription && (
              <div
                className="kyndform-classic-description"
                dangerouslySetInnerHTML={{ __html: formDescription }}
              />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="kyndform-classic-fields">
            {visibleFields.map((field, idx) => (
              <ClassicField
                key={field.id}
                field={field}
                index={idx}
                error={fieldErrors[field.id]}
                onChange={val => handleFieldChange(field.id, val)}
              />
            ))}
          </div>

          <div className="kyndform-classic-footer">
            <button type="submit" className="kyndform-classic-submit-btn" disabled={loading}>
              {loading ? t('Submitting...') : t('Submit')}
            </button>

            {submitError && <div className="kyndform-classic-submit-error">{submitError}</div>}
          </div>
        </form>
      </div>
    </div>
  )
}
