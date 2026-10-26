import { FieldLayoutAlignEnum } from '@kyndform/shared-types-enums'
import { startTransition, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/utils'
import { helper } from '@kyndform/utils'

import { Button, ImagePicker } from '@/components'
import { LAYOUT_OPTIONS } from '@/consts'

import { useStoreContext } from '../../store'
import ImageBrightness from './ImageBrightness'

const IMAGE_POSITION_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' }
]

const IMAGE_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' }
]

export default function CoverAndLayout() {
  const { t } = useTranslation()
  const { state, dispatch } = useStoreContext()
  const field = state.currentField!

  const handleChange = useCallback(
    (key: string, value: any) => {
      startTransition(() => {
        let layout = field.layout

        if (key === 'mediaUrl') {
          layout = {
            ...layout,
            mediaType: 'image',
            brightness: field.layout?.brightness ?? 0,
            align: field.layout?.align || FieldLayoutAlignEnum.INLINE
          }
        }

        dispatch({
          type: 'updateField',
          payload: {
            id: field.id,
            updates: {
              layout: {
                ...layout,
                [key]: value
              }
            }
          }
        })
      })
    },
    [dispatch, field]
  )

  const handlePropertyChange = useCallback(
    (key: string, value: any) => {
      startTransition(() => {
        dispatch({
          type: 'updateField',
          payload: {
            id: field.id,
            updates: {
              properties: {
                ...field.properties,
                [key]: value
              }
            }
          }
        })
      })
    },
    [dispatch, field]
  )

  function handleRemove() {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          layout: {}
        }
      }
    })
  }

  const imagePosition = field.properties?.imagePosition || 'bottom'
  const imageSize = field.properties?.imageSize || 'medium'

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm/6" htmlFor="#">
          {t('components.imagePicker.image')}
        </label>

        <div className="flex items-center gap-2">
          <ImagePicker
            tabs={['image', 'library', 'unsplash']}
            onChange={value => handleChange('mediaUrl', value)}
          >
            <Button.Ghost size="sm">
              {t(helper.isURL(field.layout?.mediaUrl) ? 'components.change' : 'components.add')}
            </Button.Ghost>
          </ImagePicker>

          {helper.isURL(field.layout?.mediaUrl) && (
            <Button.Ghost size="sm" onClick={handleRemove}>
              {t('components.remove')}
            </Button.Ghost>
          )}
        </div>
      </div>

      {helper.isURL(field.layout?.mediaUrl) && (
        <>
          {field.layout?.align !== FieldLayoutAlignEnum.INLINE && (
            <div className="border-accent-light mt-4 border-t pt-4">
              <ImageBrightness
                imageURL={field.layout?.mediaUrl}
                value={field.layout?.brightness}
                onChange={value => handleChange('brightness', value)}
              />
            </div>
          )}

          {field.layout?.align === FieldLayoutAlignEnum.INLINE && (
            <>
              {/* Image Position Control */}
              <div className="border-accent-light mt-4 space-y-1.5 border-t pt-4">
                <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200">
                  Image Position
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {IMAGE_POSITION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'rounded-md py-1 text-xs font-medium transition-colors',
                        imagePosition === opt.value
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      )}
                      onClick={() => handlePropertyChange('imagePosition', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Sizing Control */}
              <div className="mt-3 space-y-1.5">
                <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200">
                  Image Size
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {IMAGE_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'rounded-md py-1 text-xs font-medium transition-colors',
                        imageSize === opt.value
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      )}
                      onClick={() => handlePropertyChange('imageSize', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="border-accent-light mt-4 space-y-1 border-t pt-4">
            <label className="text-sm/6" htmlFor="#">
              {t('form.builder.settings.layout')}
            </label>

            <div className="grid grid-cols-3 gap-3">
              {LAYOUT_OPTIONS.map(row => (
                <div
                  key={row.value}
                  className={cn(
                    'border-input text-secondary hover:border-primary hover:text-primary cursor-pointer rounded-lg border ring-1 ring-transparent',
                    {
                      'border-primary text-primary ring-input': field.layout?.align === row.value
                    }
                  )}
                  onClick={() => handleChange('align', row.value)}
                >
                  <row.icon className="h-auto w-full" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
