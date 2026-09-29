export interface AiModelConfig {

  // The OpenAI-compatible endpoint to talk to
  baseUrl: string

  // The key for that endpoint
  apiKey: string

  // The model id to request from that endpoint
  modelId: string
}

// A piece of chat content. The type is a hint for rendering (e.g. 'md'),
// the text is what the model sees.
export interface ChatMessage {
  type: string
  text: string
}

export type LlmMessageRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
  role: LlmMessageRole
  content: string
}
