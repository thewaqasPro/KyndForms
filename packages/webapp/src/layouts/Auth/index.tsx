import { LayoutProps } from '@heyooo-inc/react-router'
import { FC, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { helper } from '@kyndform/utils'

import Logo from '@/assets/logo.svg?react'
import { getAppLogoUrl, getAppName } from '@/consts'

import LanguageSwitcher from './LanguageSwitcher'

export const AuthLayout: FC<LayoutProps> = ({ options, children }) => {
  const { t } = useTranslation()
  const appLogo = getAppLogoUrl()
  const appName = getAppName()

  useEffect(() => {
    if (helper.isValid(options?.title)) {
      document.title = `${t(options!.title)} - ${appName}`
    }
  }, [options, t, appName])

  return (
    <div className="bg-foreground flex min-h-screen flex-col">
      <div className="bg-foreground sticky top-0 flex items-center justify-between p-4">
        <a href="/" className="flex items-center gap-2" title={appName}>
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <>
              <Logo className="h-8 w-auto" />
              <span className="text-xl font-medium">{appName}</span>
            </>
          )}
        </a>

        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col justify-center p-4 lg:p-12">{children}</div>
    </div>
  )
}
