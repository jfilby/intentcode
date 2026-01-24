// NOTE: If variants are set to paid then quotas are expected to be setup.
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'

export interface RateLimitedDef {
  perMinute?: number | undefined
}

export interface TechDef {
  provider: string
  variantName: string
  resource: string  // NOTE: possibly string[] to support multiple resources per tech def
  model: string | null
  protocol: string
  pricingTier: string
  inputTokens: number | null
  outputTokens: number | null
  default: boolean
  isAdminOnly: boolean
  rateLimited?: RateLimitedDef | undefined
}

export class AiTechDefs {

  // Consts

  // Resources
  static embeddingsResource = 'Embeddings'
  static llmsResource = 'LLMs'

  // API types
  static chatCompletion = 'Chat Completion'

  // Categories (for UserTechProvider.category)
  static writerLlmCategory = 'Writer LLM'

  // Tech providers
  static mockedProvider = 'Mocked provider'
  static googleGeminiProvider = 'Google Gemini'
  static defaultLlmProvider = this.googleGeminiProvider

  static openAiProvider = 'OpenAI'
  static openRouterProvider = 'OpenRouter'

  // Tech protocols: AI
  static mockedAiProtocol = 'Mocked AI'
  static openAiProtocol = 'OpenAI'
  static geminiProtocol = 'Gemini'

  // LLMs by provider
  static googleGemini = 'Google Gemini'

  // Variant names
  // Mock
  static mockedLlmPaid = 'Mocked LLM'
  static mockedLlmFree = 'Mocked LLM (free tier)'

  // Last updated: 3rd July Feb 2025
  // Run the Setup in /admin/setup to install new variants and effect any
  // upgrade paths in service/tech/data/llms.ts.
  // static googleGemini_V1Pro = 'Google Gemini v1 Pro'
  // static googleGemini_V1pt5Pro = 'Google Gemini v1.5 Pro'
  // static googleGemini_V1pt5Flash = 'Google Gemini v1.5 Flash'
  static googleGemini_V2Flash = 'Google Gemini v2 Flash'
  static googleGemini_V2FlashFree = 'Google Gemini v2 Flash (free tier)'
  static googleGemini_V2pt5Pro = 'Google Gemini v2.5 Pro'
  static googleGemini_V2pt5ProFree = 'Google Gemini v2.5 Pro (free tier)'
  static googleGemini_V2pt5Flash = 'Google Gemini v2.5 Flash'
  static googleGemini_V2pt5FlashFree = 'Google Gemini v2.5 Flash (free tier)'
  static googleGemini_V2pt5FlashImageFree = 'Google Gemini v2.5 Flash Image (free tier)'
  static googleGemini_V2pt5FlashLite = 'Google Gemini v2.5 Flash-Lite'
  static googleGemini_V2pt5FlashLiteFree = 'Google Gemini v2.5 Flash-Lite (free tier)'
  static googleGemini_V3Flash = 'Google Gemini v3 Flash'
  static googleGemini_V3FlashFree = 'Google Gemini v3 Flash (free tier)'
  static googleGemini_V3Pro = 'Google Gemini v3 Pro'
  static googleGemini_V3ProFree = 'Google Gemini v3 Pro (free tier)'

  // OpenAI
  static openAi_Gpt5pt2 = 'GPT-5.2'
  static openAi_Gpt5 = 'GPT-5'
  static openAi_Gpt5Mini = 'GPT-5-mini'
  static openAi_Gpt5Nano = 'GPT-5-nano'
  static openAi_Gpt4o = 'GPT-4o'
  static openAi_Gpt4pt1 = 'GPT-4.1'
  static openAi_O4Mini = 'o4-mini'
  static openAi_O3 = 'o3'

  static openAi_TextEmedding3Small = 'OpenAI text-embedding-3-small'

  // OpenRouter
  static openRouter_DeepSeekv3_0324_Chutes = 'DeepSeek v3 0324'
  static openRouter_MistralSmall3pt2_24b_Chutes = 'Mistral Small 3.2 24B'

  // Model names
  static googleGemini_V2Flash_ModelName = 'gemini-2.0-flash'
  static googleGemini_V2pt5Pro_ModelName = 'gemini-2.5-pro'
  static googleGemini_V2pt5Flash_ModelName = 'gemini-2.5-flash-preview-09-2025'
  static googleGemini_V2pt5FlashImage_ModelName = 'gemini-2.5-flash-image'
  static googleGemini_V2pt5FlashLite_ModelName = 'gemini-2.5-flash-lite'
  static googleGemini_V3Flash_ModelName = 'gemini-3-flash-preview'
  static googleGemini_V3Pro_ModelName = 'gemini-3-pro-preview'

  static openAi_Gpt5pt2_ModelName = 'gpt-5.2'
  static openAi_Gpt5_ModelName = 'gpt-5'
  static openAi_Gpt5Mini_ModelName = 'gpt-5-mini'
  static openAi_Gpt5Nano_ModelName = 'gpt-5-nano'
  static openAi_Gpt4o_ModelName = 'gpt-4o'
  static openAi_Gpt4pt1_ModelName = 'gpt-4.1-2025-04-14'
  static openAi_O4Mini_ModelName = 'o4-mini-2025-04-16'
  static openAi_O3_ModelName = 'o3-2025-04-16'

  static openAi_TextEmedding3Small_ModelName = 'text-embedding-3-small'

  static openRouter_DeepSeekv3_0324_Chutes_ModelName = 'deepseek/deepseek-chat-v3-0324:free'
  static openRouter_MistralSmall3pt2_24b_Chutes_ModelName = 'mistralai/mistral-small-3.2-24b-instruct-2506:free'

  // Context sizes
  static mockedInputTokens = 1000
  static mockedOutputTokens = 1000

  // LLM tech providers
  static llmTechProviders = [
    {
      name: this.googleGeminiProvider
    },
    {
      name: this.openAiProvider
    },
    {
      name: this.openRouterProvider,
      baseUrl: 'https://openrouter.ai/api/v1'
    },
    {
      name: this.mockedProvider
    }    
  ]

  // A list of available LLMs
  static llmTechs: TechDef[] = [
    // Google Gemini: LLMs
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2Flash,
      resource: this.llmsResource,
      model: this.googleGemini_V2Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1048576,
      outputTokens: 8192,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2FlashFree,
      resource: this.llmsResource,
      model: this.googleGemini_V2Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1048576,
      outputTokens: 8192,
      default: false,
      isAdminOnly: true,
      rateLimited: {
        perMinute: 15
      }
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5Pro,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5Pro_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5ProFree,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5Pro_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: true
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5Flash,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5FlashFree,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: true,
      rateLimited: {
        perMinute: 10
      }
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5FlashImageFree,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5FlashImage_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 32768,
      outputTokens: 32768,
      default: false,
      isAdminOnly: true,
      rateLimited: {
        perMinute: 10
      }
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5FlashLite,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5FlashLite_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1000000,
      outputTokens: 64000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V2pt5FlashLiteFree,
      resource: this.llmsResource,
      model: this.googleGemini_V2pt5FlashLite_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1000000,
      outputTokens: 64000,
      default: false,
      isAdminOnly: true
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V3Flash,
      resource: this.llmsResource,
      model: this.googleGemini_V3Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V3FlashFree,
      resource: this.llmsResource,
      model: this.googleGemini_V3Flash_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: true,
      rateLimited: {
        perMinute: 10
      }
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V3Pro,
      resource: this.llmsResource,
      model: this.googleGemini_V3Pro_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.googleGeminiProvider,
      variantName: this.googleGemini_V3ProFree,
      resource: this.llmsResource,
      model: this.googleGemini_V3Pro_ModelName,
      protocol: this.geminiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1048576,
      outputTokens: 65536,
      default: false,
      isAdminOnly: true,
      rateLimited: {
        perMinute: 10
      }
    },

    // OpenAI: LLMs
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt5pt2,
      resource: this.llmsResource,
      model: this.openAi_Gpt5pt2_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 400000,
      outputTokens: 128000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt5,
      resource: this.llmsResource,
      model: this.openAi_Gpt5_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 400000,
      outputTokens: 128000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt5Mini,
      resource: this.llmsResource,
      model: this.openAi_Gpt5Mini_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 400000,
      outputTokens: 128000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt5Nano,
      resource: this.llmsResource,
      model: this.openAi_Gpt5Nano_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 400000,
      outputTokens: 128000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt4o,
      resource: this.llmsResource,
      model: this.openAi_Gpt4o_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 128000,
      outputTokens: 16384,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_Gpt4pt1,
      resource: this.llmsResource,
      model: this.openAi_Gpt4pt1_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1047576,
      outputTokens: 32768,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_O4Mini,
      resource: this.llmsResource,
      model: this.openAi_O4Mini_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 200000,
      outputTokens: 100000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openAiProvider,
      variantName: this.openAi_O3,
      resource: this.llmsResource,
      model: this.openAi_O3_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 200000,
      outputTokens: 100000,
      default: false,
      isAdminOnly: false
    },
    // OpenAI: embeddings
    {
      provider: this.openAiProtocol,
      variantName: this.openAi_TextEmedding3Small,
      resource: this.embeddingsResource,
      model: this.openAi_TextEmedding3Small_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: null,
      outputTokens: null,
      default: false,
      isAdminOnly: false
    },
    // OpenRouter: LLMs
    {
      provider: this.openRouterProvider,
      variantName: this.openRouter_DeepSeekv3_0324_Chutes,
      resource: this.llmsResource,
      model: this.openRouter_DeepSeekv3_0324_Chutes_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 163840,   // Note: this is really a combined input+output size
      outputTokens: 163840,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.openRouterProvider,
      variantName: this.openRouter_MistralSmall3pt2_24b_Chutes,
      resource: this.llmsResource,
      model: this.openRouter_MistralSmall3pt2_24b_Chutes_ModelName,
      protocol: this.openAiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 96000,   // Note: this is really a combined input+output size
      outputTokens: 96000,
      default: false,
      isAdminOnly: false
    },
    // Mock: LLMs
    {
      provider: this.mockedProvider,
      variantName: this.mockedLlmPaid,
      resource: this.llmsResource,
      model: null,
      protocol: this.mockedAiProtocol,
      pricingTier: SereneCoreServerTypes.paid,
      inputTokens: 1000,
      outputTokens: 1000,
      default: false,
      isAdminOnly: false
    },
    {
      provider: this.mockedProvider,
      variantName: this.mockedLlmFree,
      resource: this.llmsResource,
      model: null,
      protocol: this.mockedAiProtocol,
      pricingTier: SereneCoreServerTypes.free,
      inputTokens: 1000,
      outputTokens: 1000,
      default: false,
      isAdminOnly: false
    }
  ]

  // Variants for which to ignore jsonMode. This is useful for those that keep
  // raising an exception due to badly formed JSON. An alternative can then be
  // tried, e.g. jsonRepair.
  // Not used by the Google Gemini provider
  static variantNamesToIgnoreJsonMode = [
    ''  // Can't be an empty array or a TypeScript error is raised
  ]
}
