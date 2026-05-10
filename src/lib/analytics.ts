declare function gtag(...args: unknown[]): void

const GA_ID = 'G-XXXXXXXXXX'

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof gtag === 'undefined') return
  gtag('event', name, params)
}

export function trackPage(path: string) {
  if (typeof gtag === 'undefined') return
  gtag('config', GA_ID, { page_path: path })
}
