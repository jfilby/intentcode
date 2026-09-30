import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'


export enum VerbosityLevels {
  off = 0,
  min = 1,
  max = 2
}

export class ServerOnlyTypes {

  // Caching
  static llmCaching = true


  // Instance types
  static projectInstanceType = 'P'

  // AI tasks (the model for each is set in the environment)
  static namespace = 'intentcode'

  // Verbosity
  static verbosity = VerbosityLevels.min

  // Builds
  static oldBuildsToKeep = 3

  // Source node generation
  static keepOldSourceNodeGenerations = 3

  // Important file extensions (with .)
  static dotMdFileExt = '.md'

  // Valid depsNode keys
  static depsNodeKeys = ['extensions', 'runtimes', 'tool']

  // Specs filenames
  static techStackFilename = 'tech-stack.md'

  // Prompting
  static messagesPrompting =
    `Warnings and errors are messages have the same structure: an array ` +
    `containing the line, from, to and text fields. They might not have a ` +
    `line, from and to numbers, but they always have a text field.\n`
}

export enum AnalyzerPromptTypes {
  createSuggestions = 'createSuggestions',
  chatAboutSuggestion = 'chatAboutSuggestion'
}

export enum CommonCommands {
  add = `add`,
  back = `back`
}

export enum DepDeltaNames {
  set = 'set',
  del = 'del'
}

export enum FileOps {
  set = 'set',
  del = 'del'
}


export enum MessageTypes {
  errors = 'errors',
  warnings = 'warnings'
}

export enum Emoticons {
  tick = '✓',
  cross = '✗'
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

  // The project and the nodes every build needs. A build cannot run without
  // these, so they are read as required.
  project: ProjectRecord
  projectNode: SourceNodeRecord
  projectIntentCodeNode: SourceNodeRecord
  projectSourceNode: SourceNodeRecord

  // Nodes that exist only for some projects. The specs node is only ever
  // read, never created, and the config-directory node is absent for a
  // project with no .intentcode directory; both consumers already handle
  // their absence. Making them non-null would mean inventing a path for the
  // specs node, which would start the specs stage walking and rewriting
  // Intent files across a project that has no specs set up.
  dotIntentCodeProjectNode: SourceNodeRecord | null
  projectSpecsNode: SourceNodeRecord | null

  // Present once the analyzer has run over the project.
  projectIntentCodeAnalysisNode: SourceNodeRecord | null
}
