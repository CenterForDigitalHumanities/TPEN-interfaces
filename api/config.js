// Central environment configuration for TPEN-interfaces
// Set ACTIVE_ENV to 'dev' or 'prod' to switch environments.

// Change this line to switch environments
export const ACTIVE_ENV = 'dev' // 'dev' | 'prod'

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
