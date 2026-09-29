// App
process.env.NEXT_PUBLIC_APP_NAME ||= 'IntentCode'
process.env.NEXT_PUBLIC_DEVELOPED_FOR ||= ''
process.env.NEXT_PUBLIC_TAG_LINE ||= 'Code with intent'
process.env.NEXT_PUBLIC_LLM ||= 'Google Gemini'
process.env.NEXT_PUBLIC_PRODUCTION_HOST_NAME ||= 'https://intentcode.dev'
process.env.NEXT_PUBLIC_SERVER_PRODUCTION_HOST_NAME ||= 'https://s.intentcode.dev'

// AI
//
// The model is chosen here rather than in a database table. Any
// OpenAI-compatible endpoint works; the defaults target Google's OpenAI-compatible
// API, which serves the free Gemini tier. Set INTENTCODE_AI_API_KEY in .env.
process.env.INTENTCODE_AI_BASE_URL ||=
  'https://generativelanguage.googleapis.com/v1beta/openai/'
process.env.INTENTCODE_AI_MODEL ||= 'gemini-3.1-pro-preview'

// Optional per-AI-task overrides of the model id, e.g.
// INTENTCODE_AI_INDEXER_MODEL

// Paths
process.env.LOCAL_TESTS_PATH ||= process.cwd() + '/../../../tests'

// Crypto secrets (for basic hashing and at-rest encryption)
process.env.NEXT_PUBLIC_CRYPTO_SECRET ||= 'OD75IOH3D41N1TUSS31H3IKCT074F46WZ5V4NZ0EN2PZ2WV15G'
process.env.NEXT_PUBLIC_DB_ENCRYPT_SECRET ||= 'L371MFQVTHX7BUH3LH0WPIO950DRBKYGA5OAW24A9WOVDYQDJ9'

// Quotas
process.env.CHECK_USER_QUOTAS ||= 'false'

// Export required
export {}
