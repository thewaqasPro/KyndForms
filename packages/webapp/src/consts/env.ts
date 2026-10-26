import { helper } from '@kyndform/utils'

export const DEVICEID_COOKIE_NAME = 'KYNDFORM_DEVICE_ID'
export const LOGGED_COOKIE_NAME = 'KYNDFORM_LOGGED_IN'
export const LOCALE_COOKIE_NAME = 'KYNDFORM_LOCALE'
export const REDIRECT_COOKIE_NAME = 'KYNDFORM_REDIRECT'
export const INVITATION_COOKIE_NAME = 'KYNDFORM_INVITATION'

const globalConfig =
  (typeof window !== 'undefined' ? (window as any).kyndform || (window as any).kyndform : null) ||
  {}

export const HOMEPAGE_URL =
  globalConfig?.homepageURL || (import.meta.env.VITE_DASHBOARD_URL as string) || ''
export const DASHBOARD_URL = HOMEPAGE_URL
export const WEBSITE_URL =
  globalConfig?.websiteURL || (import.meta.env.VITE_HOMEPAGE_URL as string) || ''

export const GRAPHQL_API_URL = import.meta.env.VITE_GRAPHQL_API_URL as string
export const CDN_UPLOAD_URL = import.meta.env.VITE_CDN_UPLOAD_URL as string

export const COOKIE_DOMAIN =
  globalConfig?.cookieDomain || (import.meta.env.VITE_COOKIE_DOMAIN as string)

export const STRIPE_PUBLISHABLE_KEY =
  globalConfig?.stripePublishableKey || (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
export const GOOGLE_RECAPTCHA_KEY =
  globalConfig?.googleRecaptchaKey || (import.meta.env.VITE_GOOGLE_RECAPTCHA_KEY as string)

export const DISABLE_LOGIN_WITH_GOOGLE = helper.isTrue(
  globalConfig?.disableLoginWithGoogle || import.meta.env.VITE_DISABLE_LOGIN_WITH_GOOGLE
)
export const DISABLE_LOGIN_WITH_APPLE = helper.isTrue(
  globalConfig?.disableLoginWithApple || import.meta.env.VITE_DISABLE_LOGIN_WITH_APPLE
)
export const VERIFY_USER_EMAIL = helper.isTrue(
  globalConfig?.verifyUserEmail || import.meta.env.VITE_VERIFY_USER_EMAIL
)
export const ENABLE_GOOGLE_FONTS = helper.isTrue(
  globalConfig?.enableGoogleFonts ?? import.meta.env.VITE_ENABLE_GOOGLE_FONTS ?? 'true'
)

export function isRegistrationDisabled() {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).kyndform : null
  return helper.isTrue(
    runtimeConfig?.appDisableRegistration ??
      globalConfig?.appDisableRegistration ??
      import.meta.env.VITE_APP_DISABLE_REGISTRATION
  )
}

export function getAppLogoUrl(): string | undefined {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).kyndform : null
  return runtimeConfig?.appLogoUrl || globalConfig?.appLogoUrl || undefined
}

export function getAppName(): string {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).kyndform : null
  return runtimeConfig?.appName || globalConfig?.appName || 'KyndForm'
}

export function getVerifyEmailResendCooldownSeconds() {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).kyndform : null
  const value = Number(
    runtimeConfig?.verifyEmailResendCooldownSeconds ??
      globalConfig?.verifyEmailResendCooldownSeconds
  )
  return Number.isFinite(value) && value > 0 ? value : 60
}

export const TEMPLATES_URL =
  globalConfig?.templatesURL || (import.meta.env.VITE_TEMPLATES_URL as string)
export const HELP_CENTER_URL =
  globalConfig?.helpCenterURL || (import.meta.env.VITE_HELP_CENTER_URL as string)

export const IS_PROD = import.meta.env.NODE_ENV === 'production'
export const PACKAGE_VERSION = import.meta.env.PACKAGE_VERSION

export const COOKIE_OPTIONS: AnyMap = {
  expires: 365,
  sameSite: 'strict',
  domain: COOKIE_DOMAIN,
  secure: IS_PROD
}

if (typeof window !== 'undefined') {
  if ((window as any).kyndform) {
    ;(window as any).kyndform.enableGoogleFonts = ENABLE_GOOGLE_FONTS
  }
  if ((window as any).kyndform) {
    ;(window as any).kyndform.enableGoogleFonts = ENABLE_GOOGLE_FONTS
  }
}
