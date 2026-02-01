// App
process.env.NEXT_PUBLIC_APP_NAME ||= 'IntentCode'
process.env.NEXT_PUBLIC_DEVELOPED_FOR ||= ''
process.env.NEXT_PUBLIC_TAG_LINE ||= 'Code with intent'
process.env.NEXT_PUBLIC_LLM ||= 'Google Gemini'
process.env.NEXT_PUBLIC_PRODUCTION_HOST_NAME ||= 'https://intentcode.dev'
process.env.NEXT_PUBLIC_SERVER_PRODUCTION_HOST_NAME ||= 'https://s.intentcode.dev'


// Paths
process.env.LOCAL_TESTS_PATH ||= process.cwd() + '/./../tests'


// Crypto secrets (for basic hashing and at-rest encryption)
process.env.NEXT_PUBLIC_CRYPTO_SECRET ||= 'OD75IOH3D41N1TUSS31H3IKCT074F46WZ5V4NZ0EN2PZ2WV15G'
process.env.NEXT_PUBLIC_DB_ENCRYPT_SECRET ||= 'L371MFQVTHX7BUH3LH0WPIO950DRBKYGA5OAW24A9WOVDYQDJ9'


// Quotas
process.env.CHECK_USER_QUOTAS ||= 'false'


// Gen AI
process.env.IMAGE_VARIANT_NAME ||= 'Google Gemini v2.5 Flash Image (free tier)'

// process.env.STANDARD_LLM_VARIANT_NAME ||= 'Google Gemini v3 Flash (free tier)'
// process.env.COMPILER_LLM_VARIANT_NAME ||= 'Google Gemini v3 Flash (free tier)'
// process.env.INDEXER_LLM_VARIANT_NAME ||= 'Google Gemini v2.5 Flash (free tier)'
// process.env.SPECS_TRANSLATOR_LLM_VARIANT_NAME ||= 'Google Gemini v3 Flash (free tier)'

process.env.STANDARD_LLM_VARIANT_NAME ||= 'GPT-5.2'
process.env.COMPILER_LLM_VARIANT_NAME ||= 'GPT-5.2'
process.env.INDEXER_LLM_VARIANT_NAME ||= 'GPT-5-mini'
process.env.SPECS_TRANSLATOR_LLM_VARIANT_NAME ||= 'GPT-5.2'

process.env.CHAT_LLM_VARIANT_NAME ||= 'Google Gemini v2.5 Flash-Lite (free tier)'
process.env.STANDARD_EMBEDDINGS_VARIANT_NAME ||= 'OpenAI text-embedding-3-small'

