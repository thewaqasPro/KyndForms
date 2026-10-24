import { IconCheck, IconPhoto } from '@tabler/icons-react'
import clsx from 'clsx'
import { FC, ReactNode, useCallback, useMemo } from 'react'

import { isURL, stopEvent, useKey, useTranslation } from '../utils'
import { helper } from '@kyndform/utils'

import { IComponentProps } from '../typings'
import { Input } from './Input'

export interface ChoiceRadioOption {
  keyName?: string
  label: string
  value: any
  icon?: ReactNode
  image?: string
  enableImage?: boolean
  disabled?: boolean
}

interface ChoiceRadioProps extends ChoiceRadioOption, Omit<IComponentProps, 'onClick'> {
  isChecked?: boolean
  isOther?: boolean
  isHotkeyShow?: boolean
  onBlur?: () => void
  onClick?: (value: any) => void
  onChange?: (value: any) => void
}

export const ChoiceRadio: FC<ChoiceRadioProps> = ({
  className,
  keyName,
  image,
  label,
  value,
  icon,
  enableImage,
  isHotkeyShow,
  disabled,
  isChecked,
  isOther,
  onBlur,
  onClick,
  onChange,
  ...restProps
}) => {
  const { t } = useTranslation()

  const handleClick = useCallback(
    (event: any) => {
      stopEvent(event)

      if (!disabled) {
        onClick?.(value)
      }
    },
    [disabled, onClick, value]
  )

  const handleInputChange = useCallback(
    (newValue: any) => {
      onChange?.(newValue)
    },
    [onChange]
  )

  const labelChildren = useMemo(() => {
    if (isOther) {
      if (!isChecked) {
        return <div className="kyndform-radio-label-text">{value || label}</div>
      }

      return (
        <Input
          value={value}
          placeholder={t('Type your answer')}
          onBlur={onBlur}
          onClick={stopEvent}
          onChange={handleInputChange}
        />
      )
    }

    return label
  }, [isChecked, isOther, label, value])

  useKey(keyName?.toLowerCase() as string, handleClick)

  return (
    <div
      className={clsx(
        'kyndform-radio',
        {
          'kyndform-radio-selected': isChecked,
          'kyndform-radio-has-image': enableImage
        },
        className
      )}
      onClick={handleClick}
      {...restProps}
    >
      <div className="kyndform-radio-container">
        {enableImage && (
          <div className="kyndform-radio-image">
            {isURL(image) ? (
              <img
                src={image}
                alt={helper.isValid(label) ? label : t('Choice {{index}}', { index: keyName })}
              />
            ) : icon ? (
              icon
            ) : (
              <IconPhoto className="kyndform-radio-placeholder" />
            )}
          </div>
        )}
        <div className="kyndform-radio-content">
          {keyName && isHotkeyShow && <div className="kyndform-radio-hotkey">{keyName}</div>}
          <div className="kyndform-radio-label">{labelChildren}</div>
        </div>
        <div className="kyndform-radio-icon">
          <IconCheck />
        </div>
      </div>
    </div>
  )
}
