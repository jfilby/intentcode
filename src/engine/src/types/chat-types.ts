import type { SourceNodeRecord } from '@/core/records.js'
import { BuildData, BuildFromFile } from './build-types.js'

export interface AnalyzerChatParams {
  projectNode: SourceNodeRecord
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

export enum ChatParticipantRoles {
  user = 'U',
  agent = 'A'
}

// What the analyzer chat returns under 'suggestion' when the user asks it to
// revise a suggestion. The file deltas are the model-chosen shape the analyzer
// validator already checks, so they are passed through as-is.
export interface AnalyzerSuggestionFileDelta {
  fileOp?: string
  relativePath?: string
  change?: string
  [key: string]: unknown
}

export interface AnalyzerSuggestion {
  text: string
  fileDeltas: AnalyzerSuggestionFileDelta[]
}

export function getAnalyzerSuggestion(
          json: unknown): AnalyzerSuggestion | undefined {

  // Validate
  if (json == null ||
      typeof json !== 'object' ||
      !('suggestion' in json)) {

    return undefined
  }

  const suggestion = json.suggestion

  if (suggestion == null ||
      typeof suggestion !== 'object' ||
      !('text' in suggestion) ||
      typeof suggestion.text !== 'string') {

    return undefined
  }

  // Return
  return {
    text: suggestion.text,
    fileDeltas: getFileDeltas(suggestion)
  }
}

function getFileDeltas(suggestion: object): AnalyzerSuggestionFileDelta[] {

  // Validate
  if (!('fileDeltas' in suggestion) ||
      Array.isArray(suggestion.fileDeltas) === false) {

    return []
  }

  // Only the object entries are usable; the rest is the model guessing
  return suggestion.fileDeltas.filter(
    (fileDelta): fileDelta is AnalyzerSuggestionFileDelta =>
      fileDelta != null &&
      typeof fileDelta === 'object')
}
