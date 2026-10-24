import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { locales } from './locales'
import { AnyMap } from './typings'

export function initI18n(fallbackLng = 'en', customLocales?: AnyMap) {
  const resources = customLocales || locales

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      lowerCaseLng: true,
      supportedLngs: Object.keys(resources),
      fallbackLng,
      resources,
      interpolation: {
        escapeValue: false
      },
      react: {
        // https://react.i18next.com/latest/trans-component#trans-props
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'b', 'i', 'a']
      }
    })
  } else if (fallbackLng && i18n.language !== fallbackLng) {
    i18n.changeLanguage(fallbackLng)
  }

  return i18n
}

export function getOrInitI18n(fallbackLng = 'en', customLocales?: AnyMap) {
  return initI18n(fallbackLng, customLocales)
}
