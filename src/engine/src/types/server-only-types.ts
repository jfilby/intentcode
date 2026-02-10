import { Instance, SourceNode } from '@prisma/client'
import { AiTechDefs } from '@/serene-ai-server/types/tech-defs'
import { BuildData, BuildFromFile } from './build-types'

export enum CompilerMetaDataApproachs {
  analyzer = 'analyzer',
  indexer = 'indexer'
}

export enum IntentCodeAiTasks {
  compiler = 'compiler',
  indexer = 'indexer'
}

export enum AiTaskModelPresets {
  gemini3BasedFree = 'gemini3BasedFree',
  gemini3BasedPaid = 'gemini3BasedPaid',
  gpt5pt2Based = 'gpt5pt2Based'
}

export enum VerbosityLevels {
  off = 0,
  min = 1,
  max = 2
}

export class ServerOnlyTypes {

  // System project
  static systemProjectName = 'System'

  // Caching
  static llmCaching = true

  // Versions
  static engineVersion = '0.0.1'

  // Instance types
  static projectInstanceType = 'P'

  // AI tasks
  static namespace = 'intentcode'

  static compilerModels: Record<string, string> = {
    [AiTaskModelPresets.gemini3BasedFree]: AiTechDefs.googleGemini_V3ProFree,
    [AiTaskModelPresets.gemini3BasedPaid]: AiTechDefs.googleGemini_V3Pro,
    [AiTaskModelPresets.gpt5pt2Based]: AiTechDefs.openAi_Gpt5pt2
  }

  static indexerModels: Record<string, string> = {
    [AiTaskModelPresets.gemini3BasedFree]: AiTechDefs.googleGemini_V2pt5FlashFree,
    [AiTaskModelPresets.gemini3BasedPaid]: AiTechDefs.googleGemini_V2pt5Flash,
    [AiTaskModelPresets.gpt5pt2Based]: AiTechDefs.openAi_Gpt5Mini
  }

  // Verbosity
  static verbosity = VerbosityLevels.min

  // Compiler meta-data approach
  static compilerMetaDataApproach = CompilerMetaDataApproachs.analyzer

  // Builds
  static oldBuildsToKeep = 3

  // Source node generation
  static keepOldSourceNodeGenerations = 3

  // Existing source mode
  static includeExistingSourceMode = true

  // Libraries related
  static indexerAutoAddLibraries = true
  static compilerAutoAddLibraries = true

  // Important file extensions (with .)
  static dotMdFileExt = '.md'

  // Valid depsNode keys
  static depsNodeKeys = ['extensions', 'runtimes', 'tool']

  // Specs filenames
  static techStackFilename = 'tech-stack.md'

  // Prompting
  static messagesPrompting =
    `Warnings and errors are messages have the same structure: an array ` +
    `containing theline, from, to and text fields. They might not have a ` +
    `line, from and to numbers, but they always have a text field.\n`
}

export enum AnalyzerPromptTypes {
  createSuggestions = 'createSuggestions',
  chatAboutSuggestion = 'chatAboutSuggestion'
}

export enum DepDeltaNames {
  set = 'set',
  del = 'del'
}

export enum FileOps {
  set = 'set',
  del = 'del'
}

export enum InstanceSettingNames {
  projectPath = 'Project path'
}

export enum MessageTypes {
  errors = 'errors',
  warnings = 'warnings'
}

export enum VersionNames {
  engine = 'Engine'
}

export interface DepDelta {
  delta: string
  name: string
  minVersion: string
}

export interface FileDelta {
  projectNo: number
  relativePath: string
  fileOp: FileOps
  content?: string
}

export interface ProjectDetails {
  // Indents relative to project hierarchy
  indents: number

  // Project objects
  instance: Instance
  projectNode: SourceNode
  dotIntentCodeProjectNode: SourceNode
  projectSpecsNode: SourceNode
  projectIntentCodeNode: SourceNode
  projectSourceNode: SourceNode
  projectIntentCodeAnalysisNode: SourceNode
}
