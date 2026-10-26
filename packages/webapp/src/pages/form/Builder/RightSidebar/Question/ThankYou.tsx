import { EndScreenButton } from '@kyndform/shared-types-enums'
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconPlus,
  IconTrash
} from '@tabler/icons-react'
import { startTransition, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/utils'
import { nanoid } from '@kyndform/utils'

import { Button, Input, Select, Switch } from '@/components'

import { useStoreContext } from '../../store'
import { RequiredSettingsProps } from './Required'

const ACTION_OPTIONS = [
  { value: 'url', label: 'Visit URL / Link' },
  { value: 'reload', label: 'Submit Another Response' }
]

const VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary Style' },
  { value: 'secondary', label: 'Secondary Style' }
]

export default function ThankYou({ field }: RequiredSettingsProps) {
  const { t } = useTranslation()
  const { dispatch } = useStoreContext()

  const screenVariant = field.properties?.screenVariant || 'default'
  const align = field.properties?.align || 'center'
  const buttons: EndScreenButton[] = field.properties?.buttons || []

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

  const handleAddButton = useCallback(() => {
    if (buttons.length >= 4) return
    const newBtn: EndScreenButton = {
      id: nanoid(8),
      text: 'Learn More',
      label: 'Learn More',
      action: 'url',
      url: 'https://',
      newTab: true,
      variant: 'primary'
    }
    handlePropertyChange('buttons', [...buttons, newBtn])
  }, [buttons, handlePropertyChange])

  const handleUpdateButton = useCallback(
    (id: string, patch: Partial<EndScreenButton>) => {
      const updated = buttons.map(b => (b.id === id ? { ...b, ...patch } : b))
      handlePropertyChange('buttons', updated)
    },
    [buttons, handlePropertyChange]
  )

  const handleRemoveButton = useCallback(
    (id: string) => {
      const updated = buttons.filter(b => b.id !== id)
      handlePropertyChange('buttons', updated)
    },
    [buttons, handlePropertyChange]
  )

  return (
    <div className="space-y-4">
      {/* Screen Variant Selector */}
      <div className="space-y-1.5">
        <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200">
          Screen Style
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            className={cn(
              'rounded-md py-1.5 text-xs font-medium transition-colors',
              screenVariant === 'default'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
            onClick={() => handlePropertyChange('screenVariant', 'default')}
          >
            Default
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md py-1.5 text-xs font-medium transition-colors',
              screenVariant === 'rich'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
            onClick={() => handlePropertyChange('screenVariant', 'rich')}
          >
            Rich Custom
          </button>
        </div>
      </div>

      {/* Rich Custom Options */}
      {screenVariant === 'rich' && (
        <>
          {/* Content Alignment */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200">
              Content Alignment
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center rounded-lg border py-2 text-sm transition-colors',
                  align === 'left'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
                onClick={() => handlePropertyChange('align', 'left')}
                title="Align Left"
              >
                <IconAlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center rounded-lg border py-2 text-sm transition-colors',
                  align === 'center'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
                onClick={() => handlePropertyChange('align', 'center')}
                title="Align Center"
              >
                <IconAlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center rounded-lg border py-2 text-sm transition-colors',
                  align === 'right'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
                onClick={() => handlePropertyChange('align', 'right')}
                title="Align Right"
              >
                <IconAlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons Manager */}
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200">
                Action Buttons ({buttons.length}/4)
              </label>
              {buttons.length < 4 && (
                <Button.Ghost size="sm" onClick={handleAddButton} className="gap-1 text-xs">
                  <IconPlus className="h-3.5 w-3.5" />
                  Add
                </Button.Ghost>
              )}
            </div>

            {buttons.length === 0 && (
              <p className="text-xs text-slate-500">
                No action buttons added yet. Add buttons to link to websites or allow restarting the
                form.
              </p>
            )}

            <div className="space-y-3">
              {buttons.map((btn, idx) => (
                <div
                  key={btn.id}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Button {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(btn.id)}
                      className="text-slate-400 transition-colors hover:text-red-500"
                      title="Remove Button"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                      Label
                    </label>
                    <Input
                      value={btn.text || btn.label || ''}
                      placeholder="e.g. Visit Website"
                      onChange={val => handleUpdateButton(btn.id, { text: val, label: val })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                        Action
                      </label>
                      <Select
                        options={ACTION_OPTIONS}
                        value={btn.action}
                        onChange={val => handleUpdateButton(btn.id, { action: val })}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                        Style
                      </label>
                      <Select
                        options={VARIANT_OPTIONS}
                        value={btn.variant || 'primary'}
                        onChange={val => handleUpdateButton(btn.id, { variant: val })}
                      />
                    </div>
                  </div>

                  {btn.action === 'url' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                        Target URL
                      </label>
                      <Input
                        type="url"
                        value={btn.url || ''}
                        placeholder="https://example.com"
                        onChange={val => handleUpdateButton(btn.id, { url: val })}
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Open in new tab
                        </span>
                        <Switch
                          value={btn.newTab ?? true}
                          onChange={val => handleUpdateButton(btn.id, { newTab: val })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Completion Redirect Settings */}
      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-sm/6 font-medium text-slate-700 dark:text-slate-200" htmlFor="#">
            {t('form.builder.settings.redirect')}
          </label>

          <Switch
            value={field.properties?.redirectOnCompletion}
            onChange={value => handlePropertyChange('redirectOnCompletion', value)}
          />
        </div>

        {field.properties?.redirectOnCompletion && (
          <div className="space-y-2 pt-1">
            <Input
              placeholder="https://example.com"
              type="url"
              value={field.properties?.redirectUrl}
              onChange={value => handlePropertyChange('redirectUrl', value)}
            />

            <Input
              className="mt-2"
              trailing={t('form.share.embed.secondsDelay')}
              type="number"
              defaultValue={0}
              min={0}
              value={field.properties?.redirectDelay || 0}
              onChange={value => handlePropertyChange('redirectDelay', value)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
