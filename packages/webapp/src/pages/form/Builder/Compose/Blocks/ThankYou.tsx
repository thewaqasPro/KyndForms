import type { FC } from 'react'

import { cn } from '@/utils'

import type { BlockProps } from './Block'
import { Block } from './Block'

export const ThankYou: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const buttons = field.properties?.buttons || []
  const align = field.properties?.align || 'center'

  return (
    <Block
      className={cn('kyndform-thank-you kyndform-empty-state', `kyndform-align-${align}`)}
      field={field}
      locale={locale}
      {...restProps}
    >
      {buttons.length > 0 && (
        <div
          className={cn(
            'kyndform-action-buttons-group mt-6 flex flex-wrap gap-3',
            align === 'left' && 'justify-start',
            align === 'center' && 'justify-center',
            align === 'right' && 'justify-end'
          )}
        >
          {buttons.map(button => (
            <button
              key={button.id}
              type="button"
              className={cn(
                'kyndform-action-btn pointer-events-none rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-all',
                button.variant === 'secondary'
                  ? 'border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                  : 'bg-primary text-white hover:opacity-90'
              )}
            >
              {button.text || button.label || 'Action'}
            </button>
          ))}
        </div>
      )}
    </Block>
  )
}
