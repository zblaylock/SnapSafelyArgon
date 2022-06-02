export const SS_API = {
  DEFAULT_WEB_DOMAIN: 'https://www.sendsafely.com',
  DEFAULT_URL: 'https://app.sendsafely.com',
  BASE_URL_DEMO: 'https://demo.sendsafely.com',
  HEADERS: {
    BASE: {
      'Content-Type': 'application/json',
    },
  },
  KEY_DESCRIPTION: 'SendSafely CLI Key (auto generate)',
  PATH: {
    GENERATE_KEY: '/auth-api/generate-key/',
    GET_PACKAGE: '/api/v2.0/package/',
    GET_RECEIVED_PACKAGE: '/api/v2.0/package/received/',
    DELETE_PACKAGE: '/api/v2.0/package/{packageId}'
  }
}