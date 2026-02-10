import { SourceNode } from '@prisma/client'
import { BuildData, BuildFromFile } from './build-types'

export interface AnalyzerChatParams {
  projectNode: SourceNode
  buildData: BuildData
  buildFromFiles: BuildFromFile[]
  suggestion: any
}

export interface ChatSessionOptions {
  chatType?: ChatTypes
}
export enum ChatTypes {
  analyzerSuggestions = 'analyzerSuggestions'
}
