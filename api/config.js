// Central environment configuration for TPEN-interfaces
// ACTIVE_ENV resolution order (browser-safe):
// 1) globalThis.TPEN_ENV (set by config.env.js or inline script)
// 2) <meta name="tpen-env" content="dev|prod">
// 3) process.env.TPEN_ENV when present (e.g., SSR/build tools)
// 4) fallback to 'dev'

const META_ENV = typeof document !== 'undefined'
  ? document.querySelector('meta[name="tpen-env"]')?.content
  : undefined

export const ACTIVE_ENV = (
  // Global injected by build/workflows
  (typeof globalThis !== 'undefined' ? globalThis.TPEN_ENV : undefined)
  // Meta tag in HTML if present
  ?? META_ENV
  // Node/process (SSR/tools) if available
  ?? (typeof process !== 'undefined' ? process.env?.TPEN_ENV : undefined)
  // Default for local dev
  ?? 'dev'
)

export const ENVIRONMENTS = {
  dev: {
    BASEURL: 'https://dev.app.t-pen.org',
    servicesURL: 'https://dev.api.t-pen.org',
    tinyThingsURL: 'https://dev.tiny.t-pen.org',
    RERUMURL: 'https://devstore.rerum.io/v1',
    TPEN28URL: 'https://t-pen.org',
    TPEN3URL: 'https://three.t-pen.org',
  },
  prod: {
    BASEURL: 'https://app.t-pen.org',
    servicesURL: 'https://api.t-pen.org',
    tinyThingsURL: 'https://tiny.t-pen.org',
    RERUMURL: 'https://store.rerum.io/v1',
    TPEN28URL: 'https://t-pen.org',
    TPEN3URL: 'https://three.t-pen.org',
  }
}

export const CONFIG = {
  env: ACTIVE_ENV,
  ...ENVIRONMENTS[ACTIVE_ENV]
}
