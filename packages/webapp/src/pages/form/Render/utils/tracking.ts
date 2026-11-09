export function sanitizePixelId(id?: string): string | undefined {
  if (!id || typeof id !== 'string') return undefined
  const cleaned = id.trim()
  return /^[0-9]{5,25}$/.test(cleaned) ? cleaned : undefined
}

export function sanitizeMeasurementId(id?: string): string | undefined {
  if (!id || typeof id !== 'string') return undefined
  const cleaned = id.trim().toUpperCase()
  return /^(G-[A-Z0-9]+|UA-[0-9]+-[0-9]+)$/.test(cleaned) ? cleaned : undefined
}

export function loadScript(id: string, src: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()

  return new Promise(resolve => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => resolve() // Never reject on ad-blocker failure
    document.head.appendChild(script)
  })
}

export function initTracking(
  integrations?: Record<string, any>,
  targetWindow: any = typeof window !== 'undefined' ? window : {}
) {
  if (!integrations) return

  // 1. Meta / Facebook Pixel
  const pixelId = sanitizePixelId(integrations['facebook-pixel']?.pixelId)
  if (pixelId) {
    if (!targetWindow.fbq) {
      const fbq: any = function (...args: any[]) {
        if (fbq.callMethod) {
          fbq.callMethod(...args)
        } else {
          fbq.queue.push(args)
        }
      }
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      targetWindow.fbq = fbq
      if (!targetWindow._fbq) targetWindow._fbq = fbq
    }

    loadScript('facebook-pixel-sdk', 'https://connect.facebook.net/en_US/fbevents.js')

    try {
      targetWindow.fbq('init', pixelId)
      targetWindow.fbq('track', 'PageView')
    } catch (_) {}
  }

  // 2. Google Analytics (GA4)
  const measurementId = sanitizeMeasurementId(integrations['google-analytics']?.measurementId)
  if (measurementId) {
    targetWindow.dataLayer = targetWindow.dataLayer || []
    if (!targetWindow.gtag) {
      targetWindow.gtag = function (...args: any[]) {
        targetWindow.dataLayer.push(args)
      }
    }

    loadScript(
      'google-analytics-sdk',
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    )

    try {
      targetWindow.gtag('js', new Date())
      targetWindow.gtag('config', measurementId)
    } catch (_) {}
  }
}

export function trackFormSubmission(
  integrations?: Record<string, any>,
  details?: { formId?: string; formName?: string },
  targetWindow: any = typeof window !== 'undefined' ? window : {}
) {
  if (!integrations) return

  // 1. Meta / Facebook Pixel Lead event
  const pixelId = sanitizePixelId(integrations['facebook-pixel']?.pixelId)
  if (pixelId && typeof targetWindow.fbq === 'function') {
    try {
      targetWindow.fbq('track', 'Lead', {
        content_name: details?.formName || 'KyndForm',
        form_id: details?.formId
      })
    } catch (_) {}
  }

  // 2. Google Analytics 4 generate_lead event
  const measurementId = sanitizeMeasurementId(integrations['google-analytics']?.measurementId)
  if (measurementId && typeof targetWindow.gtag === 'function') {
    try {
      targetWindow.gtag('event', 'generate_lead', {
        form_id: details?.formId,
        form_name: details?.formName || 'KyndForm'
      })
    } catch (_) {}
  }
}
