import Router, { Route } from '@heyooo-inc/react-router'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ReactNode } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { getAuthState, getDeviceId, setCookie, setDeviceId } from '@/utils'

import { Toaster } from '@/components'
import { REDIRECT_COOKIE_NAME } from '@/consts'
import '@/i18n'
import { AuthLayout } from '@/layouts'
import '@/styles/globals.scss'

if (!getDeviceId()) {
  setDeviceId()
}

const Fallback = () => {
  const { t } = useTranslation()

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-semibold">{t('components.error.title')}</h1>
      <p className="text-secondary text-center text-sm/6">{t('components.error.message')}</p>
    </AuthLayout>
  )
}

const App = ({ routes }: { routes: Route[] }) => {
  function render(options?: any, children?: ReactNode) {
    const isLoggedIn = getAuthState()

    if (options?.loginRequired) {
      if (!isLoggedIn) {
        const redirectUri = window.location.pathname + window.location.search

        setCookie(REDIRECT_COOKIE_NAME, redirectUri, {})
        return <Navigate to="/login" replace />
      }
    } else {
      if (isLoggedIn && options?.redirectIfLogged) {
        return <Navigate to="/" replace />
      } else {
        return children
      }
    }
  }

  return (
    <ErrorBoundary fallback={<Fallback />}>
      <Tooltip.Provider>
        <Router routes={routes} render={render} />
      </Tooltip.Provider>
      <Toaster />
    </ErrorBoundary>
  )
}

let root: Root | undefined

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/config', {
      credentials: 'include'
    })

    if (response.ok) {
      const config = await response.json()

      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '0.0.0.0' ||
          window.location.hostname === '[::1]' ||
          window.location.hostname.endsWith('.localhost'))

      if (isLocalhost || import.meta.env.DEV) {
        config.websiteURL = window.location.origin
      }

      window.kyndform = {
        ...(window.kyndform || {}),
        ...config
      }
    }
  } catch (_) {}
}

async function bootstrap() {
  await loadRuntimeConfig()

  const { default: routes } = await import('@/routes')
  const container = document.getElementById('root')!

  if (!root) {
    root = createRoot(container)
  }

  root.render(<App routes={routes as Route[]} />)
}

bootstrap()
