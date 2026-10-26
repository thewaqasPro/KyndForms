import {
  ChoiceBadgeEnum,
  FieldKindEnum,
  FormField as IFormField
} from '@kyndform/shared-types-enums'
import clsx from 'clsx'
import { FC, useMemo } from 'react'

import { removeHeading, useTranslation } from '../../utils'
import { htmlUtils } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'

import {
  ChoiceRadioGroup,
  CountrySelect,
  DateInput,
  DateRangeInput,
  FileUploader,
  Input,
  PhoneNumberInput,
  Rate,
  SignaturePad,
  TableInput,
  Textarea
} from '../../components'
import { RATING_SHAPE_ICONS } from '../../consts'
import { useStore } from '../../store'

interface ClassicFieldProps {
  field: IFormField
  index: number
  error?: string
  onChange: (value: any) => void
}

export const ClassicField: FC<ClassicFieldProps> = ({ field, index, error, onChange }) => {
  const { t } = useTranslation()
  const { state } = useStore()

  const value = state.values[field.id]
  const isRequired = !!field.validations?.required

  const titleHtml = useMemo(() => {
    return field.title ? removeHeading(field.title as string) : ''
  }, [field.title])

  const descriptionHtml = useMemo(() => {
    return field.description ? htmlUtils.cleanEmptyBlocks(field.description as string) : ''
  }, [field.description])

  function handleFullNameChange(part: 'firstName' | 'lastName', val: string) {
    const prev = typeof value === 'object' && value !== null ? value : {}
    const updated = { ...prev, [part]: val }
    if (!updated.firstName && !updated.lastName) {
      onChange(undefined)
    } else {
      onChange(updated)
    }
  }

  function handleAddressChange(part: string, val: any) {
    const prev = typeof value === 'object' && value !== null ? value : {}
    const updated = { ...prev, [part]: val }
    const hasAny = Object.values(updated).some(v => helper.isValid(v) && v !== '')
    onChange(hasAny ? updated : undefined)
  }

  function renderInput() {
    switch (field.kind) {
      case FieldKindEnum.SHORT_TEXT:
        return <Input value={value} onChange={onChange} placeholder={t('Your answer goes here')} />

      case FieldKindEnum.LONG_TEXT:
        return (
          <Textarea value={value} onChange={onChange} placeholder={t('Your answer goes here')} />
        )

      case FieldKindEnum.NUMBER:
        return (
          <Input
            type="number"
            value={value}
            onChange={onChange}
            min={field.validations?.min}
            max={field.validations?.max}
            placeholder={t('Your answer goes here')}
          />
        )

      case FieldKindEnum.EMAIL:
        return (
          <Input
            type="email"
            value={value}
            onChange={onChange}
            placeholder={t('name@example.com')}
          />
        )

      case FieldKindEnum.URL:
        return <Input type="text" value={value} onChange={onChange} placeholder="https://" />

      case FieldKindEnum.PHONE_NUMBER:
        return <PhoneNumberInput value={value} onChange={onChange} />

      case FieldKindEnum.YES_NO: {
        const yesNoOptions = [
          { label: t('Yes'), value: true },
          { label: t('No'), value: false }
        ]
        return (
          <ChoiceRadioGroup
            options={yesNoOptions}
            badge={ChoiceBadgeEnum.LETTER}
            value={{ value: helper.isValid(value) ? [value] : [] }}
            onChange={val => onChange(val?.value?.[0])}
            isHotkeyShow={false}
            verticalAlignment={false}
          />
        )
      }

      case FieldKindEnum.MULTIPLE_CHOICE: {
        const options = (field.properties?.choices || []).map(c => ({
          label: c.label,
          value: c.id
        }))
        return (
          <ChoiceRadioGroup
            options={options}
            allowMultiple={field.properties?.allowMultiple}
            allowOther={field.properties?.allowOther}
            badge={ChoiceBadgeEnum.LETTER}
            value={
              typeof value === 'object' && value !== null
                ? value
                : { value: Array.isArray(value) ? value : value ? [value] : [] }
            }
            onChange={onChange}
            isHotkeyShow={false}
            verticalAlignment={field.properties?.verticalAlignment ?? true}
          />
        )
      }

      case FieldKindEnum.PICTURE_CHOICE: {
        const options = (field.properties?.choices || []).map(c => ({
          label: c.label,
          value: c.id,
          image: c.image
        }))
        return (
          <ChoiceRadioGroup
            options={options}
            enableImage
            allowMultiple={field.properties?.allowMultiple}
            allowOther={field.properties?.allowOther}
            badge={ChoiceBadgeEnum.LETTER}
            value={
              typeof value === 'object' && value !== null
                ? value
                : { value: Array.isArray(value) ? value : value ? [value] : [] }
            }
            onChange={onChange}
            isHotkeyShow={false}
          />
        )
      }

      case FieldKindEnum.RATING: {
        const shape = field.properties?.shape || 'star'
        const icon = (RATING_SHAPE_ICONS as any)[shape] || RATING_SHAPE_ICONS.star
        return (
          <Rate
            count={field.properties?.total || 5}
            value={value}
            onChange={onChange}
            itemRender={(idx: number) => (
              <>
                {icon}
                <span className="kyndform-rate-index">{idx}</span>
              </>
            )}
          />
        )
      }

      case FieldKindEnum.OPINION_SCALE: {
        const total = field.properties?.total || 10
        const min = (field.properties as any)?.startAtOne ? 1 : 0
        const scaleValues = Array.from({ length: total }, (_, i) => min + i)
        return (
          <div className="kyndform-classic-opinion-scale">
            {scaleValues.map(num => (
              <button
                key={num}
                type="button"
                className={clsx('kyndform-opinion-btn', {
                  'is-selected': value === num
                })}
                onClick={() => onChange(num)}
              >
                {num}
              </button>
            ))}
          </div>
        )
      }

      case FieldKindEnum.DATE:
        return <DateInput format={field.properties?.format} value={value} onChange={onChange} />

      case FieldKindEnum.DATE_RANGE:
        return (
          <DateRangeInput format={field.properties?.format} value={value} onChange={onChange} />
        )

      case FieldKindEnum.COUNTRY:
        return <CountrySelect value={value} onChange={onChange} />

      case FieldKindEnum.FULL_NAME:
        return (
          <div className="kyndform-classic-grid-2">
            <Input
              value={value?.firstName}
              onChange={val => handleFullNameChange('firstName', val)}
              placeholder={t('First Name')}
            />
            <Input
              value={value?.lastName}
              onChange={val => handleFullNameChange('lastName', val)}
              placeholder={t('Last Name')}
            />
          </div>
        )

      case FieldKindEnum.ADDRESS:
        return (
          <div className="space-y-3">
            <Input
              value={value?.address1}
              onChange={val => handleAddressChange('address1', val)}
              placeholder={t('Address Line 1')}
            />
            <Input
              value={value?.address2}
              onChange={val => handleAddressChange('address2', val)}
              placeholder={t('Address Line 2 (optional)')}
            />
            <div className="kyndform-classic-grid-2">
              <Input
                value={value?.city}
                onChange={val => handleAddressChange('city', val)}
                placeholder={t('City')}
              />
              <Input
                value={value?.state}
                onChange={val => handleAddressChange('state', val)}
                placeholder={t('State/Province')}
              />
            </div>
            <div className="kyndform-classic-grid-2">
              <Input
                value={value?.zip}
                onChange={val => handleAddressChange('zip', val)}
                placeholder={t('Postal Code')}
              />
              <CountrySelect
                value={value?.country}
                onChange={val => handleAddressChange('country', val)}
              />
            </div>
          </div>
        )

      case FieldKindEnum.FILE_UPLOAD:
        return <FileUploader value={value} onChange={onChange} />

      case FieldKindEnum.SIGNATURE:
        return <SignaturePad value={value} onChange={onChange} />

      case FieldKindEnum.LEGAL_TERMS:
        return (
          <label className="kyndform-classic-legal">
            <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
            <span>{field.properties?.buttonText || t('I agree to the terms and conditions')}</span>
          </label>
        )

      case FieldKindEnum.INPUT_TABLE:
        return (
          <TableInput
            columns={field.properties?.tableColumns || []}
            value={value}
            onChange={onChange}
          />
        )

      case FieldKindEnum.STATEMENT:
        return null

      default:
        return <Input value={value} onChange={onChange} placeholder={t('Your answer goes here')} />
    }
  }

  return (
    <div
      id={`field-${field.id}`}
      className={clsx(
        'kyndform-classic-field',
        field.kind ? `kyndform-${field.kind.replace(/_/g, '-')}` : undefined,
        {
          'has-error': !!error
        }
      )}
    >
      <label className="kyndform-classic-label">
        <span
          id={`field-${field.id}-prefix`}
          aria-label={t('Question {{number}} of {{total}}', {
            number: index + 1,
            total: state.questionCount || state.fields.length
          })}
          data-qa="question-header-counter"
          className="kyndform-classic-number kyndform-block-number-badge"
        >
          {index + 1}
        </span>
        {titleHtml && (
          <span
            className="kyndform-classic-title-text"
            dangerouslySetInnerHTML={{ __html: titleHtml }}
          />
        )}
        {isRequired && <span className="kyndform-classic-required">*</span>}
      </label>

      {descriptionHtml && (
        <div
          className="kyndform-classic-field-description"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      )}

      <div className="kyndform-classic-field-control">{renderInput()}</div>

      {error && <div className="kyndform-classic-error-message">⚠️ {error}</div>}
    </div>
  )
}
