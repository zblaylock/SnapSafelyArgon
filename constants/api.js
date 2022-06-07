export const SS_API = {
  DEBUG: {
    MODE: true,
    API_KEY: "95tAwrAPiv-HC7ITEb9iMA",
    API_SECRET: "-cEaIbJaK25jVSB1pF_SuQ",
    EMAIL: "zack.blaylock@sendsafely.net",
    PASSWORD: "password1!",
    LOCAL_NGROK: 'a8f3-136-55-151-24.ngrok.io',
  },
  PROTOCOL: "https://",
  DEFAULT_WEB_DOMAIN: 'https://www.sendsafely.com',
  DEFAULT_URL: 'https://app.sendsafely.com',
  BASE_URL_DEMO: 'https://demo.sendsafely.com',
  HEADERS: {
    JSON: {
      'Content-Type': 'application/json',
    },
    MULTIPART_FORM_DATA: {
      'Content-Type': 'multipart/form-data',
    }
  },
  KEY_DESCRIPTION: 'SendSafely CLI Key (auto generate)',
  PATH: {
    GENERATE_KEY: '/auth-api/generate-key/',
    GET_PACKAGE: '/api/v2.0/package/',
    CREATE_PACKAGE: '/api/v2.0/package/',
    GET_RECEIVED_PACKAGE: '/api/v2.0/package/received/',
    DELETE_PACKAGE: '/api/v2.0/package/{packageId}',
    FINALIZE_PACKAGE: '/api/v2.0/package/{packageId}/finalize/',
    ADD_RECIPIENT: '/api/v2.0/package/{packageId}/recipient/',
    DELETE_RECIPIENT: '/api/v2.0/package/{packageId}/recipient/{recipientId}/',
    CREATE_FILE: '/api/v2.0/package/{packageId}/file/',
    ADD_FILE: '/api/v2.0/package/{packageId}/file/{fileId}',
    UPLOAD_URLS: '/api/v2.0/package/{packageId}/file/{fileId}/upload-urls/',
    ADD_MESSAGE: '/api/v2.0/package/{packageId}/message/',
    UPLOAD_COMPLETE: '/api/v2.0/package/{packageId}/file/{fileId}/upload-complete/'
  }
}