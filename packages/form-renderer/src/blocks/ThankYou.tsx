import { EndScreenButton } from '@kyndform/shared-types-enums'
import clsx from 'clsx'
import type { FC } from 'react'
import { useEffect } from 'react'

import { isURL } from '../utils'

import { useStore } from '../store'
import { WelcomeBranding } from '../views/Branding'
import type { BlockProps } from './Block'
import { Block } from './Block'

export const ThankYou: FC<BlockProps> = ({ field, className, children, ...restProps }) => {
  const { state } = useStore()

  useEffect(() => {
    let redirectUrl = field.properties?.redirectUrl

    if (state.customUrlRedirects && field.properties?.redirectOnCompletion && redirectUrl) {
      const delay = (field.properties?.redirectDelay || 0) * 1_000

      if (!isURL(redirectUrl)) {
        redirectUrl = 'https://' + redirectUrl
      }

      setTimeout(() => {
        window.location.href = redirectUrl as string
      }, delay)
    }
  }, [])

  const buttons: EndScreenButton[] = field.properties?.buttons || []
  const align = field.properties?.align || 'center'

  const handleButtonClick = (button: EndScreenButton) => {
    if (button.action === 'reload') {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
      return
    }

    let destination = button.url || ''
    if (!destination) return

    if (!isURL(destination)) {
      destination = 'https://' + destination
    }

    if (button.newTab) {
      window.open(destination, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = destination
    }
  }

  return (
    <>
      <Block
        className={clsx(
          'kyndform-empty-state kyndform-thank-you',
          `kyndform-align-${align}`,
          className
        )}
        field={field}
        isScrollable={false}
        {...restProps}
      >
        {buttons.length > 0 && (
          <div
            className={clsx(
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
                onClick={() => handleButtonClick(button)}
                className={clsx(
                  'kyndform-action-btn cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-all',
                  button.variant === 'secondary'
                    ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    : 'bg-primary text-white hover:opacity-90'
                )}
              >
                {button.text || button.label || 'Action'}
              </button>
            ))}
          </div>
        )}
        {children}
      </Block>
      <WelcomeBranding />
    </>
  )
}
