import { Instance, SourceNode } from '@prisma/client'

export enum VerbosityLevels {
  off = 'off',
  min = 'min',
  max = 'max'
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

  // Important file extensions (with .)
  static dotMdFileExt = '.md'

  // Verbosity
  static verbosity = VerbosityLevels.max

  // Builds
  static oldBuildsToKeep = 3

  // Source node generation
  static keepOldSourceNodeGenerations = 3

  // Existing source mode
  static includeExistingSourceMode = true

  // Libraries related
  static indexerAutoAddLibraries = true
  static compilerAutoAddLibraries = true

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

export enum DepDeltaNames {
  set = 'set',
  del = 'del'
}

export enum FileDeltas {
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

export enum LlmEnvNames {
  compilerEnvName = 'COMPILER_LLM_VARIANT_NAME',
  indexerEnvName = 'INDEXER_LLM_VARIANT_NAME',
  specsTranslatorEnvName = `SPECS_TRANSLATOR_LLM_VARIANT_NAME`
}

export enum VersionNames {
  engine = 'Engine'
}

export interface DepDelta {
  delta: string
  name: string
  minVersion: string
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
